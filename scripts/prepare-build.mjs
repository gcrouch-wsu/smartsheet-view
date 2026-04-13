import { rm } from "node:fs/promises";
import path from "node:path";

// Next.js 16 can persist dev-only generated types in .next/dev that do not belong in a production build.
await rm(path.join(process.cwd(), ".next", "dev"), { recursive: true, force: true });
