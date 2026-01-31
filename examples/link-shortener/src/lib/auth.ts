import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { keystrokeLatency } from "better-auth/plugins";

const db = new Database("sqlite.db");

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    keystrokeLatency({
      // PHYSICS-BASED THRESHOLD
      // Light in fiber travels at ~67% speed of light (200,000 km/s)
      // Seattle → Tokyo (7,700km): minimum 77ms round-trip (physically impossible to beat)
      // Seattle → Singapore (13,400km): minimum 134ms round-trip
      // Your baseline: ~28ms (local connection)
      // At 70ms, overseas connections are PHYSICALLY IMPOSSIBLE
      maxLatency: 70, // Light itself can't travel from Japan in under 77ms
      onSuspicious: "block", // BLOCK the login attempt
      baselineSamples: 2, // Only need 2 logins to establish baseline (faster demo)
      maxDeviationPercent: 50, // Flag if 50% higher than baseline
      onAlert: async ({ userId, latency, baselineLatency, ipAddress }) => {
        console.log("\n" + "!".repeat(60));
        console.log("🚨 BLOCKED: SUSPICIOUS REMOTE ACCESS DETECTED!");
        console.log("!".repeat(60));
        console.log(`User ID: ${userId}`);
        console.log(`Measured Latency: ${latency}ms`);
        console.log(`Your Baseline: ${baselineLatency ?? "not yet established"}ms`);
        console.log(`IP Address: ${ipAddress}`);
        console.log(`Verdict: Latency too high - possible remote control`);
        console.log("!".repeat(60) + "\n");
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
