import type { BetterAuthPluginDBSchema } from "@better-auth/core/db";

export const keystrokeLatencySchema = () =>
	({
		latencyLog: {
			fields: {
				/**
				 * The user ID this log belongs to
				 */
				userId: {
					type: "string",
					references: { model: "user", field: "id", onDelete: "cascade" },
					required: true,
					input: false,
					index: true,
				},
				/**
				 * The measured round-trip latency in milliseconds
				 */
				latency: {
					type: "number",
					required: true,
					input: false,
				},
				/**
				 * The IP address of the request
				 */
				ipAddress: {
					type: "string",
					required: false,
					input: false,
				},
				/**
				 * The user agent string
				 */
				userAgent: {
					type: "string",
					required: false,
					input: false,
				},
				/**
				 * Whether this login was flagged as suspicious
				 */
				flagged: {
					type: "boolean",
					required: true,
					input: false,
					defaultValue: false,
				},
				/**
				 * The baseline latency for this user (running average)
				 */
				baselineLatency: {
					type: "number",
					required: false,
					input: false,
				},
				/**
				 * The deviation from baseline (percentage)
				 */
				deviationPercent: {
					type: "number",
					required: false,
					input: false,
				},
				/**
				 * When this log was created
				 */
				createdAt: {
					type: "date",
					required: true,
					input: false,
				},
			},
		},
		/**
		 * Store per-user baseline latency profiles
		 */
		latencyBaseline: {
			fields: {
				/**
				 * The user ID this baseline belongs to
				 */
				userId: {
					type: "string",
					references: { model: "user", field: "id", onDelete: "cascade" },
					required: true,
					input: false,
					unique: true,
				},
				/**
				 * The baseline latency in milliseconds (running average)
				 */
				baselineLatency: {
					type: "number",
					required: true,
					input: false,
				},
				/**
				 * Number of samples used to calculate baseline
				 */
				sampleCount: {
					type: "number",
					required: true,
					input: false,
					defaultValue: 0,
				},
				/**
				 * Minimum observed latency
				 */
				minLatency: {
					type: "number",
					required: false,
					input: false,
				},
				/**
				 * Maximum observed latency
				 */
				maxLatency: {
					type: "number",
					required: false,
					input: false,
				},
				/**
				 * When the baseline was last updated
				 */
				updatedAt: {
					type: "date",
					required: true,
					input: false,
				},
			},
		},
	}) satisfies BetterAuthPluginDBSchema;
