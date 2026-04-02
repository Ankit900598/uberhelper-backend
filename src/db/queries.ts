import type pg from "pg";
import type { JobStatus, JobEventActorRole } from "./types.js";

export async function upsertUserByPhone(
  db: pg.Pool,
  input: { phone: string; role: "client" | "worker" }
): Promise<{ userId: string }> {
  const q = await db.query(
    `insert into users(role, phone, is_phone_verified)
     values ($1, $2, false)
     on conflict (phone) do update set role = excluded.role
     returning id`,
    [input.role, input.phone]
  );
  return { userId: q.rows[0].id as string };
}

export async function markPhoneVerified(db: pg.Pool, userId: string): Promise<void> {
  await db.query(`update users set is_phone_verified=true where id=$1`, [userId]);
}

export async function getUserById(
  db: pg.Pool,
  userId: string
): Promise<{ id: string; role: string; phone: string; is_phone_verified: boolean } | null> {
  const q = await db.query(`select id, role, phone, is_phone_verified from users where id=$1`, [userId]);
  return (q.rows[0] as any) ?? null;
}

export async function ensureWorkerProfile(db: pg.Pool, userId: string): Promise<void> {
  await db.query(
    `insert into worker_profiles(user_id)
     values ($1)
     on conflict (user_id) do nothing`,
    [userId]
  );
}

export async function setWorkerApproval(db: pg.Pool, userId: string, isApproved: boolean): Promise<void> {
  await db.query(`update worker_profiles set is_approved=$2, updated_at=now() where user_id=$1`, [
    userId,
    isApproved
  ]);
}

export async function setWorkerUpiId(db: pg.Pool, userId: string, upiId: string): Promise<void> {
  await db.query(`update worker_profiles set worker_upi_id=$2, updated_at=now() where user_id=$1`, [userId, upiId]);
}

export async function updateWorkerAvailabilityInDb(
  db: pg.Pool,
  input: { userId: string; isAvailable: boolean; lat: number; lon: number; categories: string[] }
): Promise<void> {
  await db.query(
    `update worker_profiles
     set is_available=$2,
         last_seen_at=now(),
         last_known_lat=$3,
         last_known_lon=$4,
         categories=$5::text[],
         updated_at=now()
     where user_id=$1`,
    [input.userId, input.isAvailable, input.lat, input.lon, input.categories]
  );
}

export async function createJob(
  db: pg.Pool,
  input: {
    clientId: string;
    category: string;
    pickupLat: number;
    pickupLon: number;
    pickupAddress?: string;
    durationHours: number;
    amountCashCents: number;
    notes?: string;
  }
): Promise<{ jobId: string }> {
  const q = await db.query(
    `insert into jobs(
      client_id, category, status,
      pickup_lat, pickup_lon, pickup_address,
      job_duration_hours, job_amount_cash_cents, notes
     ) values ($1,$2,'Requested',$3,$4,$5,$6,$7,$8)
     returning id`,
    [
      input.clientId,
      input.category,
      input.pickupLat,
      input.pickupLon,
      input.pickupAddress ?? null,
      input.durationHours,
      input.amountCashCents,
      input.notes ?? null
    ]
  );
  return { jobId: q.rows[0].id as string };
}

export async function setJobStatus(db: pg.Pool, jobId: string, status: JobStatus): Promise<void> {
  await db.query(`update jobs set status=$2, updated_at=now() where id=$1`, [jobId, status]);
}

export async function assignWorkerToJob(db: pg.Pool, jobId: string, workerId: string): Promise<boolean> {
  // Only assign if not assigned already
  const q = await db.query(
    `update jobs set worker_id=$2, status='Accepted', updated_at=now()
     where id=$1 and worker_id is null and status in ('Requested','Offered')
     returning id`,
    [jobId, workerId]
  );
  return q.rowCount === 1;
}

export async function insertJobEvent(
  db: pg.Pool,
  input: { jobId: string; status: JobStatus; actorRole: JobEventActorRole; actorUserId?: string; meta?: any }
): Promise<void> {
  await db.query(
    `insert into job_events(job_id, status, actor_role, actor_user_id, meta)
     values ($1,$2,$3,$4,$5::jsonb)`,
    [input.jobId, input.status, input.actorRole, input.actorUserId ?? null, JSON.stringify(input.meta ?? {})]
  );
}

export async function createOffers(
  db: pg.Pool,
  input: { jobId: string; workerIds: string[] }
): Promise<{ offerIds: string[] }> {
  const offerIds: string[] = [];
  for (const wid of input.workerIds) {
    const q = await db.query(`insert into job_offers(job_id, worker_id, decision) values ($1,$2,'Timeout') returning id`, [
      input.jobId,
      wid
    ]);
    offerIds.push(q.rows[0].id as string);
  }
  return { offerIds };
}

export async function decideOffer(
  db: pg.Pool,
  input: { offerId: string; workerId: string; decision: "Accepted" | "Rejected" }
): Promise<{ jobId: string } | null> {
  const q = await db.query(
    `update job_offers set decision=$3, responded_at=now()
     where id=$1 and worker_id=$2
     returning job_id`,
    [input.offerId, input.workerId, input.decision]
  );
  if (q.rowCount !== 1) return null;
  return { jobId: q.rows[0].job_id as string };
}

export async function listWorkerPendingOffers(
  db: pg.Pool,
  workerId: string
): Promise<Array<{ offer_id: string; job_id: string; pickup_lat: number; pickup_lon: number; job_duration_hours: number; job_amount_cash_cents: number; status: string }>> {
  const q = await db.query(
    `select o.id as offer_id,
            o.job_id as job_id,
            j.pickup_lat as pickup_lat,
            j.pickup_lon as pickup_lon,
            j.job_duration_hours as job_duration_hours,
            j.job_amount_cash_cents as job_amount_cash_cents,
            j.status as status
     from job_offers o
     join jobs j on j.id = o.job_id
     where o.worker_id=$1 and o.decision='Timeout' and j.status in ('Requested','Offered')
     order by o.offered_at desc
     limit 20`,
    [workerId]
  );
  return q.rows as any;
}

export async function getJobWithPhones(
  db: pg.Pool,
  jobId: string
): Promise<
  | null
  | {
      id: string;
      status: JobStatus;
      client_id: string;
      worker_id: string | null;
      client_phone: string;
      worker_phone: string | null;
      job_amount_cash_cents: number;
    }
> {
  const q = await db.query(
    `select j.id, j.status, j.client_id, j.worker_id, c.phone as client_phone, w.phone as worker_phone, j.job_amount_cash_cents
     from jobs j
     join users c on c.id = j.client_id
     left join users w on w.id = j.worker_id
     where j.id=$1`,
    [jobId]
  );
  return (q.rows[0] as any) ?? null;
}

export async function createFeeRow(
  db: pg.Pool,
  input: { jobId: string; feeAmountCents: number; feePercent: number; txRef: string }
): Promise<{ feeId: string }> {
  const q = await db.query(
    `insert into fees(job_id, fee_percent, fee_amount_cents, status, worker_upi_transaction_ref)
     values ($1,$2,$3,'Requested',$4)
     on conflict (job_id) do update set
       fee_percent=excluded.fee_percent,
       fee_amount_cents=excluded.fee_amount_cents,
       worker_upi_transaction_ref=excluded.worker_upi_transaction_ref,
       updated_at=now()
     returning id`,
    [input.jobId, input.feePercent, input.feeAmountCents, input.txRef]
  );
  return { feeId: q.rows[0].id as string };
}

