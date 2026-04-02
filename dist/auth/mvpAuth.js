import { getUserById } from "../db/queries.js";
/**
 * MVP auth:
 * Use `Authorization: Bearer <userId>` as token.
 * Replace with real JWT/session later.
 */
export function requireAuth(db) {
    return async (req, res, next) => {
        const h = req.header("authorization") ?? "";
        const token = h.startsWith("Bearer ") ? h.slice("Bearer ".length).trim() : "";
        if (!token)
            return res.status(401).json({ error: "missing_token" });
        const user = await getUserById(db, token);
        if (!user)
            return res.status(401).json({ error: "invalid_token" });
        req.user = { id: user.id, role: user.role, phone: user.phone };
        next();
    };
}
export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "missing_user" });
        if (req.user.role !== role)
            return res.status(403).json({ error: "forbidden" });
        next();
    };
}
