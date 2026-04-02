import fs from "node:fs";
import path from "node:path";

export interface AppConfig {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  platformUpiId: string;
  platformUpiName: string;
  otpExpiresSeconds: number;
  otpMaxAttempts: number;
  gridCellSizeMeters: number;
  dispatchOfferToClosestN: number;
  dispatchMaxRing: number;
}

function readPilotParams(): Partial<{
  grid: { cellSizeMeters: number; maxRingForInitialDispatch: number };
  dispatch: { offerToClosestN: number };
}> {
  try {
    const p = path.resolve(process.cwd(), "config", "pilot_params.json");
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const pilot = readPilotParams();
  const port = Number(env.PORT ?? 3000);

  return {
    port,
    databaseUrl: env.DATABASE_URL ?? "postgres://uberhelper:uberhelper@localhost:5432/uberhelper",
    redisUrl: env.REDIS_URL ?? "redis://localhost:6379",
    platformUpiId: env.PLATFORM_UPI_ID ?? "ay1181mnc@oksbi",
    platformUpiName: env.PLATFORM_UPI_NAME ?? "UberHelper",
    otpExpiresSeconds: Number(env.OTP_EXPIRES_SECONDS ?? 300),
    otpMaxAttempts: Number(env.OTP_MAX_ATTEMPTS ?? 5),
    gridCellSizeMeters: Number(env.GRID_CELL_SIZE_METERS ?? pilot.grid?.cellSizeMeters ?? 500),
    dispatchOfferToClosestN: Number(
      env.DISPATCH_OFFER_TO_CLOSEST_N ?? pilot.dispatch?.offerToClosestN ?? 5
    ),
    dispatchMaxRing: Number(env.DISPATCH_MAX_RING ?? pilot.grid?.maxRingForInitialDispatch ?? 2)
  };
}

