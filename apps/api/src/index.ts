// ─────────────────────────────────────────────────────────────
// Entry point. Its only job is to start listening.
// The app itself is built in app.ts.
// ─────────────────────────────────────────────────────────────
import { app } from "./app";
import { env } from "./lib/env";

app.listen(env.PORT);

console.log(`🦊 Zeni API running at http://localhost:${env.PORT}`);
console.log(`📚 API docs at         http://localhost:${env.PORT}/swagger`);
