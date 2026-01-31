import { describe, expect, it, vi } from "vitest";
import { createAuthClient } from "../../client";
import { getTestInstance } from "../../test-utils/test-instance";
import { keystrokeLatencyClient } from "./client";
import { KEYSTROKE_LATENCY_ERROR_CODES, keystrokeLatency } from "./index";

describe("Keystroke Latency Plugin", async () => {
	const alertCallback = vi.fn();

	const { auth, customFetchImpl } = await getTestInstance({
		plugins: [
			keystrokeLatency({
				maxLatency: 100,
				onSuspicious: "log",
				baselineSamples: 3,
				maxDeviationPercent: 100,
				onAlert: alertCallback,
			}),
		],
	});

	const testClient = createAuthClient({
		baseURL: "http://localhost:3000/api/auth",
		fetchOptions: {
			customFetchImpl,
		},
		plugins: [keystrokeLatencyClient()],
	});

	describe("ping endpoint", () => {
		it("should respond to ping requests", async () => {
			const clientTimestamp = Date.now();
			const response = await auth.api.latencyPing({
				body: { clientTimestamp },
			});

			expect(response.pong).toBe(true);
			expect(response.serverTimestamp).toBeDefined();
			expect(response.clientTimestamp).toBe(clientTimestamp);
		});

		it("should return server timestamp that is close to current time", async () => {
			const before = Date.now();
			const response = await auth.api.latencyPing({
				body: { clientTimestamp: before },
			});
			const after = Date.now();

			expect(response.serverTimestamp).toBeGreaterThanOrEqual(before);
			expect(response.serverTimestamp).toBeLessThanOrEqual(after);
		});
	});

	describe("authentication requirements", () => {
		it("should require authentication for baseline endpoint", async () => {
			try {
				await auth.api.getLatencyBaseline({});
				expect.fail("Should have thrown unauthorized error");
			} catch (error: any) {
				expect(error.status).toBe("UNAUTHORIZED");
			}
		});

		it("should require authentication for history endpoint", async () => {
			try {
				await auth.api.getLatencyHistory({});
				expect.fail("Should have thrown unauthorized error");
			} catch (error: any) {
				expect(error.status).toBe("UNAUTHORIZED");
			}
		});
	});

	describe("flagged logins endpoint", () => {
		it("should return empty flagged list initially", async () => {
			const response = await auth.api.getFlaggedLogins({});

			expect(response.flagged).toEqual([]);
		});

		it("should accept limit parameter", async () => {
			const response = await auth.api.getFlaggedLogins({
				query: { limit: "10" },
			});

			expect(response.flagged).toEqual([]);
		});
	});

	describe("error codes", () => {
		it("should export error codes", () => {
			expect(KEYSTROKE_LATENCY_ERROR_CODES.SUSPICIOUS_LATENCY).toBeDefined();
			expect(KEYSTROKE_LATENCY_ERROR_CODES.LATENCY_BLOCKED).toBeDefined();
			expect(
				KEYSTROKE_LATENCY_ERROR_CODES.REQUIRES_TWO_FACTOR_AUTH,
			).toBeDefined();
		});
	});

	describe("client plugin", () => {
		it("should have latency measure function", () => {
			expect(testClient.latency.measure).toBeDefined();
			expect(typeof testClient.latency.measure).toBe("function");
		});

		it("should have latency getHistory function", () => {
			expect(testClient.latency.getHistory).toBeDefined();
			expect(typeof testClient.latency.getHistory).toBe("function");
		});

		it("should have latency getBaseline function", () => {
			expect(testClient.latency.getBaseline).toBeDefined();
			expect(typeof testClient.latency.getBaseline).toBe("function");
		});

		it("should have latency getFlagged function", () => {
			expect(testClient.latency.getFlagged).toBeDefined();
			expect(typeof testClient.latency.getFlagged).toBe("function");
		});
	});
});

describe("Keystroke Latency Plugin - Block Mode", async () => {
	const { auth } = await getTestInstance({
		plugins: [
			keystrokeLatency({
				maxLatency: 50,
				onSuspicious: "block",
				baselineSamples: 1,
			}),
		],
	});

	it("should have block mode configured", async () => {
		// Verify the plugin is configured - just check ping works
		const response = await auth.api.latencyPing({
			body: { clientTimestamp: Date.now() },
		});
		expect(response.pong).toBe(true);
	});
});

describe("Keystroke Latency Plugin - Require 2FA Mode", async () => {
	const { auth } = await getTestInstance({
		plugins: [
			keystrokeLatency({
				maxLatency: 50,
				onSuspicious: "require-2fa",
				baselineSamples: 1,
			}),
		],
	});

	it("should have require-2fa mode configured", async () => {
		// Verify the plugin is configured - just check ping works
		const response = await auth.api.latencyPing({
			body: { clientTimestamp: Date.now() },
		});
		expect(response.pong).toBe(true);
	});
});

describe("Keystroke Latency Plugin - Custom Options", async () => {
	const customAlert = vi.fn();

	const { auth } = await getTestInstance({
		plugins: [
			keystrokeLatency({
				maxLatency: 200,
				onSuspicious: "flag",
				baselineSamples: 10,
				maxDeviationPercent: 50,
				onAlert: customAlert,
				continuousMonitoring: true,
			}),
		],
	});

	it("should accept custom configuration", async () => {
		const response = await auth.api.latencyPing({
			body: { clientTimestamp: Date.now() },
		});
		expect(response.pong).toBe(true);
	});
});
