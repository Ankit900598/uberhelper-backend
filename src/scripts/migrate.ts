import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { loadConfig } from "../config.js";
import { createPool } from "../db/pool.js";

async function main() {
  const cfg = loadConfig(process.env);
  const db = createPool(cfg.databaseUrl);

  const sqlDir = path.resolve(process.cwd(), "sql");
  const files = fs
    .readdirSync(sqlDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const f of files) {
    const full = path.join(sqlDir, f);
    const sql = fs.readFileSync(full, "utf8");
    // eslint-disable-next-line no-console
    console.log(`Applying ${f}...`);
    await db.query(sql);
  }

  await db.end();
  // eslint-disable-next-line no-console
  console.log("Migrations applied.");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

