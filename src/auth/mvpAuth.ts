import type { Request, Response, NextFunction } from "express";
import type pg from "pg";
import { getUserById } from "../db/queries.js";

declare global {
  // eslint-disable-next-line no-var
  var __uberhelper_mvp: unknown;
}

export interface AuthedRequest extends Request {
  user?: { id: string; role: "client" | "worker" | "admin"; phone: string };
}

/**
 * MVP auth:
 * Use `Authorization: Bearer <userId>` as token.
 * Replace with real JWT/session later.
 */
export function requireAuth(db: pg.Pool) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const h = req.header("authorization") ?? "";
    const token = h.startsWith("Bearer ") ? h.slice("Bearer ".length).trim() : "";
    if (!token) return res.status(401).json({ error: "missing_token" });

    const user = await getUserById(db, token);
    if (!user) return res.status(401).json({ error: "invalid_token" });
    req.user = { id: user.id, role: user.role as any, phone: user.phone };
    next();
  };
}

export function requireRole(role: "client" | "worker" | "admin") {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "missing_user" });
    if (req.user.role !== role) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

