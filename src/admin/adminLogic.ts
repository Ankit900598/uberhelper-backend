import type { JobEvent } from "../db/types";

/**
 * MVP admin logic scaffolding.
 * In a real backend you would:
 * - Load worker record from DB
 * - Enforce role checks (admin auth)
 * - Append job_events + update jobs.status in a transaction
 */

export type CancelReason =
  | "admin_cancel"
  | "no_show"
  | "fraud"
  | "client_request"
  | "policy_violation";

export async function approveWorker(
  deps: {
    // db.getWorkerProfile(userId)
    // db.updateWorkerApproval(userId, isApproved)
  },
  workerUserId: string
): Promise<void> {
  // Pseudocode:
  // profile = await deps.db.getWorkerProfile(workerUserId)
  // await deps.db.updateWorkerApproval(workerUserId, true)
}

export async function getJobTimeline(
  deps: {
    // db.listJobEvents(jobId)
  },
  jobId: string
): Promise<JobEvent[]> {
  // Pseudocode:
  // return await deps.db.listJobEvents(jobId)
  return [];
}

export async function adminCancelJob(
  deps: {
    // db.appendJobEvent(jobId, status, actorRole, reason)
    // db.updateJobStatus(jobId, "Cancelled")
  },
  jobId: string,
  reason: CancelReason
): Promise<void> {
  // Pseudocode:
  // await deps.db.appendJobEvent(jobId, "Cancelled", "admin", { reason })
  // await deps.db.updateJobStatus(jobId, "Cancelled")
}

