export async function approveWorker(deps, workerUserId) {
    // Pseudocode:
    // profile = await deps.db.getWorkerProfile(workerUserId)
    // await deps.db.updateWorkerApproval(workerUserId, true)
}
export async function getJobTimeline(deps, jobId) {
    // Pseudocode:
    // return await deps.db.listJobEvents(jobId)
    return [];
}
export async function adminCancelJob(deps, jobId, reason) {
    // Pseudocode:
    // await deps.db.appendJobEvent(jobId, "Cancelled", "admin", { reason })
    // await deps.db.updateJobStatus(jobId, "Cancelled")
}
