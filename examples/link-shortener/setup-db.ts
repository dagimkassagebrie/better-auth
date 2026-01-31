import { auth } from "./src/lib/auth";

async function setup() {
  console.log("Running Better Auth migrations...");
  await auth.api.migrateDatabase({ body: {} });
  console.log("Database setup complete!");
  process.exit(0);
}

setup().catch(console.error);
