import type { BetterAuthPlugin } from "@better-auth/core";
import {
	createAuthEndpoint,
	createAuthMiddleware,
} from "@better-auth/core/api";
import { defineErrorCodes } from "@better-auth/core/utils";
import * as z from "zod";
import { APIError } from "../../api";
import { getIp } from "../../utils/get-request-ip";
import { keystrokeLatencySchema } from "./schema";

/**
 * Database model for user latency baselines
 */
interface LatencyBaseline {
	id: string;
	userId: string;
	baselineLatency: number;
	sampleCount: number;
	minLatency: number | null;
	maxLatency: number | null;
	updatedAt: Date;
}

/**
 * Configuration options for the keystroke latency detection plugin
 */
export interface KeystrokeLatencyOptions {
	/**
	 * Maximum allowed latency in milliseconds before flagging as suspicious
	 * @default 100
	 */
	maxLatency?: number;
	/**
	 * Action to take when suspicious latency is detected
	 * - "log": Just log the event (default)
	 * - "flag": Log and mark session as suspicious
	 * - "block": Block the sign-in attempt
	 * - "require-2fa": Require two-factor authentication
	 * @default "log"
	 */
	onSuspicious?: "log" | "flag" | "block" | "require-2fa";
	/**
	 * Number of samples required before enforcing baseline comparison
	 * During enrollment, latencies are collected but not enforced
	 * @default 5
	 */
	baselineSamples?: number;
	/**
	 * Maximum deviation from baseline (as percentage) before flagging
	 * E.g., 50 means flag if latency is 50% higher than baseline
	 * @default 100
	 */
	maxDeviationPercent?: number;
	/**
	 * Callback when suspicious latency is detected
	 */
	onAlert?: (data: {
		userId: string;
		latency: number;
		baselineLatency: number | null;
		deviationPercent: number | null;
		ipAddress: string;
		userAgent: string;
	}) => void | Promise<void>;
	/**
	 * Whether to track latency on every request or just sign-in
	 * @default false
	 */
	continuousMonitoring?: boolean;
}

export const KEYSTROKE_LATENCY_ERROR_CODES = defineErrorCodes({
	SUSPICIOUS_LATENCY: "Network latency indicates possible remote access",
	LATENCY_BLOCKED: "Sign-in blocked due to suspicious network latency",
	REQUIRES_TWO_FACTOR_AUTH:
		"Additional verification required due to unusual network conditions",
});

/**
 * Plugin to detect suspicious network latency that may indicate
 * remote access fraud (e.g., someone controlling a laptop from overseas)
 *
 * This is based on the technique Amazon used to detect North Korean
 * infiltrators who were remotely controlling US-based laptops.
 *
 * @example
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { keystrokeLatency } from "better-auth/plugins";
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     keystrokeLatency({
 *       maxLatency: 100, // Flag anything over 100ms
 *       onSuspicious: "flag",
 *       onAlert: async ({ userId, latency, ipAddress }) => {
 *         // Send alert to security team
 *         await sendSlackAlert(`Suspicious login: ${userId} with ${latency}ms latency from ${ipAddress}`);
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export const keystrokeLatency = (options?: KeystrokeLatencyOptions) => {
	const opts = {
		maxLatency: options?.maxLatency ?? 100,
		onSuspicious: options?.onSuspicious ?? "log",
		baselineSamples: options?.baselineSamples ?? 5,
		maxDeviationPercent: options?.maxDeviationPercent ?? 100,
		onAlert: options?.onAlert,
		continuousMonitoring: options?.continuousMonitoring ?? false,
	};

	const schema = keystrokeLatencySchema();

	return {
		id: "keystroke-latency",
		$ERROR_CODES: KEYSTROKE_LATENCY_ERROR_CODES,

		endpoints: {
			/**
			 * Ping endpoint for client-side latency measurement
			 *
			 * POST `/latency/ping`
			 */
			latencyPing: createAuthEndpoint(
				"/latency/ping",
				{
					method: "POST",
					body: z.object({
						clientTimestamp: z.number(),
					}),
				},
				async (ctx) => {
					const serverTimestamp = Date.now();
					return ctx.json({
						pong: true,
						serverTimestamp,
						clientTimestamp: ctx.body.clientTimestamp,
					});
				},
			),

			/**
			 * Get latency history for the current user
			 *
			 * GET `/latency/history`
			 */
			getLatencyHistory: createAuthEndpoint(
				"/latency/history",
				{
					method: "GET",
					use: [
						createAuthMiddleware(async (ctx) => {
							if (!ctx.context.session) {
								throw new APIError("UNAUTHORIZED");
							}
						}),
					],
					query: z
						.object({
							limit: z.string().optional(),
							flaggedOnly: z.string().optional(),
						})
						.optional(),
				},
				async (ctx) => {
					const userId = ctx.context.session!.user.id;
					const limit = ctx.query?.limit ? parseInt(ctx.query.limit) : 50;
					const flaggedOnly = ctx.query?.flaggedOnly === "true";

					const where = flaggedOnly
						? [
								{ field: "userId", value: userId },
								{ field: "flagged", value: true },
							]
						: [{ field: "userId", value: userId }];

					const logs = await ctx.context.adapter.findMany({
						model: "latencyLog",
						where,
						sortBy: { field: "createdAt", direction: "desc" },
						limit,
					});

					return ctx.json({ logs });
				},
			),

			/**
			 * Get the user's baseline latency profile
			 *
			 * GET `/latency/baseline`
			 */
			getLatencyBaseline: createAuthEndpoint(
				"/latency/baseline",
				{
					method: "GET",
					use: [
						createAuthMiddleware(async (ctx) => {
							if (!ctx.context.session) {
								throw new APIError("UNAUTHORIZED");
							}
						}),
					],
				},
				async (ctx) => {
					const userId = ctx.context.session!.user.id;

					const baseline = await ctx.context.adapter.findOne<LatencyBaseline>({
						model: "latencyBaseline",
						where: [{ field: "userId", value: userId }],
					});

					return ctx.json({
						baseline: baseline || null,
						isEnrolled: baseline
							? baseline.sampleCount >= opts.baselineSamples
							: false,
						samplesNeeded: baseline
							? Math.max(0, opts.baselineSamples - baseline.sampleCount)
							: opts.baselineSamples,
					});
				},
			),

			/**
			 * Get all flagged logins (admin endpoint)
			 *
			 * GET `/latency/flagged`
			 */
			getFlaggedLogins: createAuthEndpoint(
				"/latency/flagged",
				{
					method: "GET",
					query: z
						.object({
							limit: z.string().optional(),
						})
						.optional(),
				},
				async (ctx) => {
					// Note: In production, add admin role check here
					const limit = ctx.query?.limit ? parseInt(ctx.query.limit) : 100;

					const flagged = await ctx.context.adapter.findMany({
						model: "latencyLog",
						where: [{ field: "flagged", value: true }],
						sortBy: { field: "createdAt", direction: "desc" },
						limit,
					});

					return ctx.json({ flagged });
				},
			),
		},

		hooks: {
			after: [
				{
					// Hook into sign-in endpoints to capture latency
					matcher: (ctx) => {
						if (!ctx.path) {
							return false;
						}
						const signInPaths = [
							"/sign-in/email",
							"/sign-in/social",
							"/callback/",
							"/sign-in/username",
						];
						return signInPaths.some((path) => ctx.path!.includes(path));
					},
					handler: createAuthMiddleware(async (ctx) => {
						const measuredLatency = ctx.body?.measuredLatency;

						// If client didn't send latency data, skip
						if (typeof measuredLatency !== "number") {
							return;
						}

						const userId = ctx.context.session?.user?.id;
						if (!userId) {
							return;
						}

						const ipAddress = ctx.request
							? (getIp(ctx.request, ctx.context.options) ?? "unknown")
							: "unknown";
						const userAgent =
							ctx.request?.headers.get("user-agent") || "unknown";

						// Get or create baseline
						const baseline = await ctx.context.adapter.findOne<LatencyBaseline>(
							{
								model: "latencyBaseline",
								where: [{ field: "userId", value: userId }],
							},
						);

						let deviationPercent: number | null = null;
						let isSuspicious = false;

						if (baseline && baseline.sampleCount >= opts.baselineSamples) {
							// Calculate deviation from baseline
							deviationPercent =
								((measuredLatency - baseline.baselineLatency) /
									baseline.baselineLatency) *
								100;

							// Check if suspicious
							isSuspicious =
								measuredLatency > opts.maxLatency ||
								deviationPercent > opts.maxDeviationPercent;
						} else {
							// Still in enrollment phase - just check absolute threshold
							isSuspicious = measuredLatency > opts.maxLatency * 2; // More lenient during enrollment
						}

						// Log the latency
						await ctx.context.adapter.create({
							model: "latencyLog",
							data: {
								id: crypto.randomUUID(),
								userId,
								latency: measuredLatency,
								ipAddress,
								userAgent,
								flagged: isSuspicious,
								baselineLatency: baseline?.baselineLatency || null,
								deviationPercent,
								createdAt: new Date(),
							},
						});

						// Update baseline (rolling average)
						if (baseline) {
							const newSampleCount = baseline.sampleCount + 1;
							const newBaseline =
								(baseline.baselineLatency * baseline.sampleCount +
									measuredLatency) /
								newSampleCount;

							await ctx.context.adapter.update({
								model: "latencyBaseline",
								where: [{ field: "userId", value: userId }],
								update: {
									baselineLatency: newBaseline,
									sampleCount: newSampleCount,
									minLatency: Math.min(
										baseline.minLatency || measuredLatency,
										measuredLatency,
									),
									maxLatency: Math.max(
										baseline.maxLatency || measuredLatency,
										measuredLatency,
									),
									updatedAt: new Date(),
								},
							});
						} else {
							await ctx.context.adapter.create({
								model: "latencyBaseline",
								data: {
									id: crypto.randomUUID(),
									userId,
									baselineLatency: measuredLatency,
									sampleCount: 1,
									minLatency: measuredLatency,
									maxLatency: measuredLatency,
									updatedAt: new Date(),
								},
							});
						}

						// Handle suspicious latency
						if (isSuspicious) {
							// Call alert callback
							if (opts.onAlert) {
								await opts.onAlert({
									userId,
									latency: measuredLatency,
									baselineLatency: baseline?.baselineLatency || null,
									deviationPercent,
									ipAddress,
									userAgent,
								});
							}

							ctx.context.logger.warn(
								`Suspicious latency detected for user ${userId}: ${measuredLatency}ms (baseline: ${baseline?.baselineLatency || "not established"}ms)`,
							);

							if (opts.onSuspicious === "block") {
								// Invalidate the session
								if (ctx.context.session) {
									await ctx.context.internalAdapter.deleteSession(
										ctx.context.session.session.token,
									);
								}
								throw new APIError("FORBIDDEN", {
									message: KEYSTROKE_LATENCY_ERROR_CODES.LATENCY_BLOCKED,
								});
							}

							if (opts.onSuspicious === "require-2fa") {
								// This would integrate with the two-factor plugin
								// For now, just throw an error indicating 2FA is needed
								throw new APIError("FORBIDDEN", {
									message:
										KEYSTROKE_LATENCY_ERROR_CODES.REQUIRES_TWO_FACTOR_AUTH,
								});
							}
						}
					}),
				},
			],
		},

		schema,
		options,
	} satisfies BetterAuthPlugin;
};

export type * from "./schema";
