export interface RaiseSosInput {
  userId?: string;
  jobId?: string;
  actorRole: "client" | "worker" | "admin" | "system";
  lat?: number;
  lon?: number;
  message?: string;
}

/**
 * SOS scaffolding for MVP.
 * In production:
 * - store row in `sos_events`
 * - notify admin control room
 * - optionally call police/helpline (integration)
 */
export async function raiseSos(
  deps: {
    // db.insertSosEvent(...)
  },
  input: RaiseSosInput
): Promise<void> {
  // Pseudocode:
  // await deps.db.insertSosEvent(input)
}

