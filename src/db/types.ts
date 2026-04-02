// UberHelperMVP backend types for v1
// This file is documentation + in-memory model reference for the MVP.

export type UserRole = "client" | "worker" | "admin";

export type JobStatus =
  | "Requested"
  | "Offered"
  | "Accepted"
  | "Arrived"
  | "Started"
  | "Completed"
  | "Cancelled";

export type JobOfferDecision = "Accepted" | "Rejected" | "Timeout";

export type JobEventActorRole = "client" | "worker" | "admin" | "system";

export type FeeStatus = "Requested" | "Paid" | "Reversed" | "Withheld";

export type MoneyCents = number;

export interface User {
  id: string;
  role: UserRole;
  phone: string;
  isPhoneVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string; // ISO
}

export interface WorkerProfile {
  userId: string;
  categories: string[];
  isAvailable: boolean;
  lastSeenAt?: string; // ISO
  lastKnownLat?: number;
  lastKnownLon?: number;
  updatedAt: string; // ISO
}

export interface Job {
  id: string;
  clientId: string;
  workerId?: string;
  category: string; // "QuickHelper" in v1
  status: JobStatus;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLon?: number;
  requestedTime: string; // ISO
  scheduledStartTime?: string; // ISO
  jobDurationHours: number;
  jobAmountCashCents: MoneyCents;
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface JobOffer {
  id: string;
  jobId: string;
  workerId: string;
  offeredAt: string; // ISO
  respondedAt?: string; // ISO
  decision: JobOfferDecision;
}

export interface JobEvent {
  id: string;
  jobId: string;
  status: JobStatus;
  actorRole: JobEventActorRole;
  actorUserId?: string;
  createdAt: string; // ISO
  meta: Record<string, unknown>;
}

export interface Fee {
  id: string;
  jobId: string;
  feePercent: number; // 10.00
  feeAmountCents: MoneyCents;
  status: FeeStatus;
  workerUpiTransactionRef?: string;
  workerPaidAt?: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

