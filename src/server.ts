import "dotenv/config";
import express from "express";
import cors from "cors";
import Redis from "ioredis";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import {
  upsertUserByPhone,
  markPhoneVerified,
  ensureWorkerProfile,
  setWorkerUpiId,
  updateWorkerAvailabilityInDb,
  createJob,
  insertJobEvent,
  setJobStatus,
  createOffers,
  listWorkerPendingOffers,
  decideOffer,
  assignWorkerToJob,
  getJobWithPhones,
  setWorkerApproval,
  createFeeRow
} from "./db/queries.js";
import { requireAuth, requireRole, type AuthedRequest } from "./auth/mvpAuth.js";
import { latLonToCell, cellToKey, neighborsInRing } from "./matching/grid.js";
import { haversineMeters } from "./matching/haversine.js";
import { calcPlatformFeeCents, generateUpiPayLink } from "./fees/fee.js";
import { generateOtpCode, otpHash, verifyOtp } from "./safety/otp.js";

const cfg = loadConfig(process.env);
const db = createPool(cfg.databaseUrl);
const redis = new Redis(cfg.redisUrl, {
  tls: {},
  maxRetriesPerRequest: null
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

// --- Redis keys ---
function workerLocKey(workerId: string) {
  return `workerloc:${workerId}`;
}
function cellWorkersKey(cellKey: string) {
  return `cell:${cellKey}:workers`;
}

// --- OTP (dev-friendly) ---
const otpRequestSchema = z.object({
  phone: z.string().min(8).max(20),
  role: z.enum(["client", "worker"])
});

app.post("/auth/otp/request", async (req, res) => {
  const parsed = otpRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const { phone, role } = parsed.data;
  const { userId } = await upsertUserByPhone(db, { phone, role });
  if (role === "worker") await ensureWorkerProfile(db, userId);

  const otp = generateOtpCode();
  const hash = otpHash(otp);
  const expiresAt = new Date(Date.now() + cfg.otpExpiresSeconds * 1000);

  const q = await db.query(
    `insert into otp_requests(phone, role, otp_hash, expires_at, attempts_used, is_verified)
     values ($1,$2,$3,$4,0,false)
     returning id`,
    [phone, role, hash, expiresAt.toISOString()]
  );

  // MVP: return OTP directly so you can test without SMS provider.
  return res.json({ requestId: q.rows[0].id, otpDev: otp, userId, token: userId });
});

const otpVerifySchema = z.object({
  requestId: z.string().uuid(),
  otp: z.string().length(6)
});

app.post("/auth/otp/verify", async (req, res) => {
  const parsed = otpVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const row = await db.query(
    `select id, phone, otp_hash, expires_at, attempts_used, is_verified
     from otp_requests where id=$1`,
    [parsed.data.requestId]
  );
  if (row.rowCount !== 1) return res.status(404).json({ error: "request_not_found" });
  const r = row.rows[0] as any;

  const verify = verifyOtp({
    otpCode: parsed.data.otp,
    otpRow: {
      otpHash: r.otp_hash,
      expiresAtMs: new Date(r.expires_at).getTime(),
      attemptsUsed: r.attempts_used,
      maxAttempts: cfg.otpMaxAttempts,
      isVerified: r.is_verified
    }
  });

  await db.query(`update otp_requests set attempts_used = attempts_used + 1 where id=$1`, [r.id]);
  if (!verify.ok) return res.status(400).json({ error: verify.reason ?? "otp_failed" });

  await db.query(`update otp_requests set is_verified=true where id=$1`, [r.id]);

  // Mark the user verified.
  const u = await db.query(`select id from users where phone=$1 limit 1`, [r.phone]);
  if (u.rowCount === 1) await markPhoneVerified(db, u.rows[0].id);

  // MVP token is userId
  return res.json({ ok: true, token: u.rows[0].id });
});

// --- Worker availability + location index ---
app.post("/workers/availability", requireAuth(db), requireRole("worker"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    isAvailable: z.boolean(),
    categories: z.array(z.string()).default(["QuickHelper"]),
    lat: z.number(),
    lon: z.number(),
    workerUpiId: z.string().min(3).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const workerId = req.user!.id;
  const { isAvailable, categories, lat, lon, workerUpiId } = parsed.data;

  await ensureWorkerProfile(db, workerId);
  if (workerUpiId) await setWorkerUpiId(db, workerId, workerUpiId);
  await updateWorkerAvailabilityInDb(db, { userId: workerId, isAvailable, lat, lon, categories });

  // Redis index
  const cell = latLonToCell(lat, lon, { cellSizeMeters: cfg.gridCellSizeMeters });
  const key = cellToKey(cell);

  const locKey = workerLocKey(workerId);
  await redis.hset(locKey, {
    workerId,
    lat: lat.toString(),
    lon: lon.toString(),
    lastSeenAt: new Date().toISOString(),
    cellKey: key
  });
  await redis.expire(locKey, 60); // location TTL; worker must refresh periodically

  // Maintain cell membership
  await redis.sadd(cellWorkersKey(key), workerId);
  await redis.expire(cellWorkersKey(key), 120);

  return res.json({ ok: true, cellKey: key });
});

// Debug endpoint for client to see nearby workers quickly
app.get("/workers/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: "invalid_lat_lon" });

  const clientCell = latLonToCell(lat, lon, { cellSizeMeters: cfg.gridCellSizeMeters });
  const ids = new Set<string>();
  for (let r = 0; r <= cfg.dispatchMaxRing; r++) {
    for (const c of neighborsInRing(clientCell, r)) {
      const key = cellToKey(c);
      const members = await redis.smembers(cellWorkersKey(key));
      for (const id of members) ids.add(id);
      if (ids.size >= limit) break;
    }
    if (ids.size >= limit) break;
  }
  return res.json({ workerIds: Array.from(ids).slice(0, limit) });
});

// --- Jobs + dispatch ---
app.post("/jobs", requireAuth(db), requireRole("client"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    category: z.string().default("QuickHelper"),
    durationHours: z.number().int().min(2).max(4),
    amountCashCents: z.number().int().min(1),
    pickupLat: z.number(),
    pickupLon: z.number(),
    pickupAddress: z.string().optional(),
    notes: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const { jobId } = await createJob(db, {
    clientId: req.user!.id,
    category: parsed.data.category,
    pickupLat: parsed.data.pickupLat,
    pickupLon: parsed.data.pickupLon,
    pickupAddress: parsed.data.pickupAddress,
    durationHours: parsed.data.durationHours,
    amountCashCents: parsed.data.amountCashCents,
    notes: parsed.data.notes
  });
  await insertJobEvent(db, { jobId, status: "Requested", actorRole: "client", actorUserId: req.user!.id });

  // Dispatch: scan cells and pick closest N workers by distance.
  const clientCell = latLonToCell(parsed.data.pickupLat, parsed.data.pickupLon, { cellSizeMeters: cfg.gridCellSizeMeters });
  const candidates: Array<{ workerId: string; lat: number; lon: number; dist: number }> = [];
  const seen = new Set<string>();

  for (let r = 0; r <= cfg.dispatchMaxRing; r++) {
    const ringCells = neighborsInRing(clientCell, r);
    for (const c of ringCells) {
      const key = cellToKey(c);
      const workerIds = await redis.smembers(cellWorkersKey(key));
      for (const workerId of workerIds) {
        if (seen.has(workerId)) continue;
        seen.add(workerId);
        const loc = await redis.hgetall(workerLocKey(workerId));
        const wlat = Number(loc.lat);
        const wlon = Number(loc.lon);
        if (!Number.isFinite(wlat) || !Number.isFinite(wlon)) continue;
        const dist = haversineMeters(parsed.data.pickupLat, parsed.data.pickupLon, wlat, wlon);
        candidates.push({ workerId, lat: wlat, lon: wlon, dist });
      }
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  const selected = candidates.slice(0, cfg.dispatchOfferToClosestN).map((c) => c.workerId);

  if (selected.length > 0) {
    await setJobStatus(db, jobId, "Offered");
    await insertJobEvent(db, { jobId, status: "Offered", actorRole: "system", meta: { selectedCount: selected.length } });
    await createOffers(db, { jobId, workerIds: selected });
  }

  return res.json({ jobId, offeredTo: selected.length });
});

app.get("/jobs/:jobId", requireAuth(db), async (req: AuthedRequest, res) => {
  const jobId = req.params.jobId;
  const job = await getJobWithPhones(db, jobId);
  if (!job) return res.status(404).json({ error: "job_not_found" });

  const isClient = req.user!.id === job.client_id;
  const isWorker = job.worker_id != null && req.user!.id === job.worker_id;
  if (!isClient && !isWorker && req.user!.role !== "admin") return res.status(403).json({ error: "forbidden" });

  const phoneVisible = job.status !== "Requested" && job.status !== "Offered";
  const otherPhone = isClient ? job.worker_phone : job.client_phone;

  return res.json({
    id: job.id,
    status: job.status,
    jobAmountCashCents: job.job_amount_cash_cents,
    otherPhoneVisible: phoneVisible,
    otherPhone: phoneVisible ? otherPhone : null
  });
});

// Worker: list pending offers
app.get("/workers/me/offers", requireAuth(db), requireRole("worker"), async (req: AuthedRequest, res) => {
  const offers = await listWorkerPendingOffers(db, req.user!.id);
  return res.json({ offers });
});

// Worker: accept/reject offer
app.post("/job_offers/:offerId/decision", requireAuth(db), requireRole("worker"), async (req: AuthedRequest, res) => {
  const schema = z.object({ decision: z.enum(["Accepted", "Rejected"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const offerId = req.params.offerId;
  const row = await decideOffer(db, { offerId, workerId: req.user!.id, decision: parsed.data.decision });
  if (!row) return res.status(404).json({ error: "offer_not_found" });

  if (parsed.data.decision === "Accepted") {
    const assigned = await assignWorkerToJob(db, row.jobId, req.user!.id);
    if (!assigned) return res.status(409).json({ error: "job_already_assigned" });
    await insertJobEvent(db, { jobId: row.jobId, status: "Accepted", actorRole: "worker", actorUserId: req.user!.id });
  }

  return res.json({ ok: true, jobId: row.jobId });
});

// Job status updates (client or worker)
app.post("/jobs/:jobId/status", requireAuth(db), async (req: AuthedRequest, res) => {
  const schema = z.object({
    status: z.enum(["Arrived", "Started", "Completed", "Cancelled"]),
    meta: z.record(z.any()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const jobId = req.params.jobId;
  const job = await getJobWithPhones(db, jobId);
  if (!job) return res.status(404).json({ error: "job_not_found" });

  const isClient = req.user!.id === job.client_id;
  const isWorker = job.worker_id != null && req.user!.id === job.worker_id;
  if (!isClient && !isWorker && req.user!.role !== "admin") return res.status(403).json({ error: "forbidden" });

  // Minimal rules: only client can mark Completed (per v1 contract), worker can update Arrived/Started.
  if (parsed.data.status === "Completed" && !isClient) return res.status(403).json({ error: "only_client_can_complete" });
  if ((parsed.data.status === "Arrived" || parsed.data.status === "Started") && !isWorker) {
    return res.status(403).json({ error: "only_worker_can_update" });
  }

  await setJobStatus(db, jobId, parsed.data.status as any);
  await insertJobEvent(db, {
    jobId,
    status: parsed.data.status as any,
    actorRole: req.user!.role,
    actorUserId: req.user!.id,
    meta: parsed.data.meta
  });

  // Fee creation on completion
  if (parsed.data.status === "Completed") {
    const feeAmountCents = calcPlatformFeeCents({ jobAmountCashCents: job.job_amount_cash_cents, feePercent: 10.0 });
    const txRef = `FEE_${jobId}_${Date.now()}`;
    const { feeId } = await createFeeRow(db, { jobId, feeAmountCents, feePercent: 10.0, txRef });
    const upiLink = generateUpiPayLink({
      payeeUpiId: cfg.platformUpiId,
      payeeName: cfg.platformUpiName,
      amountCents: feeAmountCents,
      transactionRef: txRef,
      note: `UberHelper fee for job ${jobId}`
    });
    return res.json({ ok: true, feeId, feeAmountCents, upiLink });
  }

  return res.json({ ok: true });
});

// --- Admin endpoints (MVP auth: Authorization Bearer <adminUserId>) ---
app.post("/admin/workers/:workerId/approve", requireAuth(db), requireRole("admin"), async (req: AuthedRequest, res) => {
  await setWorkerApproval(db, req.params.workerId, true);
  return res.json({ ok: true });
});

app.get("/admin/jobs/:jobId/events", requireAuth(db), requireRole("admin"), async (req: AuthedRequest, res) => {
  const q = await db.query(`select * from job_events where job_id=$1 order by created_at asc`, [req.params.jobId]);
  return res.json({ events: q.rows });
});

app.post("/admin/jobs/:jobId/cancel", requireAuth(db), requireRole("admin"), async (req: AuthedRequest, res) => {
  const schema = z.object({ reason: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  await setJobStatus(db, req.params.jobId, "Cancelled");
  await insertJobEvent(db, {
    jobId: req.params.jobId,
    status: "Cancelled",
    actorRole: "admin",
    actorUserId: req.user!.id,
    meta: { reason: parsed.data.reason }
  });
  return res.json({ ok: true });
});

app.get("/health", async (_req, res) => {
  try {
    await db.query("select 1");
    await redis.ping();
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(cfg.port, () => {
  // eslint-disable-next-line no-console
  console.log(`UberHelper backend listening on :${cfg.port}`);
});

