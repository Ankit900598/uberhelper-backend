export type DisputeReason =
  | "no_show"
  | "work_not_as_described"
  | "cancelled_by_client"
  | "cancelled_by_worker"
  | "fraud"
  | "payment_issue"
  | "safety_concern"
  | "other";

export function normalizeDisputeReason(reason: string): DisputeReason {
  const r = reason.trim().toLowerCase();
  switch (r) {
    case "no_show":
    case "noshow":
      return "no_show";
    case "fraud":
      return "fraud";
    case "payment_issue":
    case "payment":
      return "payment_issue";
    case "safety_concern":
    case "safety":
      return "safety_concern";
    case "work_not_as_described":
      return "work_not_as_described";
    case "cancelled_by_client":
      return "cancelled_by_client";
    case "cancelled_by_worker":
      return "cancelled_by_worker";
    default:
      return "other";
  }
}

