import type { BetterAuthClientPlugin } from "../../client/types";
import type { keystrokeLatency } from "./index";

/**
 * Client-side helper for measuring network latency
 *
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/client";
 * import { keystrokeLatencyClient } from "better-auth/client/plugins";
 *
 * const authClient = createAuthClient({
 *   plugins: [keystrokeLatencyClient()],
 * });
 *
 * // Measure latency before sign-in
 * const latency = await authClient.latency.measure();
 *
 * // Sign in with latency data
 * await authClient.signIn.email({
 *   email: "user@example.com",
 *   password: "password",
 *   measuredLatency: latency,
 * });
 * ```
 */
export const keystrokeLatencyClient = () => {
	return {
		id: "keystroke-latency",
		$InferServerPlugin: {} as ReturnType<typeof keystrokeLatency>,
		getActions: ($fetch) => ({
			latency: {
				/**
				 * Measure round-trip latency to the auth server
				 * Takes multiple samples and returns the median for accuracy
				 *
				 * @param samples Number of ping samples to take (default: 3)
				 * @returns Median latency in milliseconds
				 */
				measure: async (samples = 3): Promise<number> => {
					const latencies: number[] = [];

					for (let i = 0; i < samples; i++) {
						const start = performance.now();
						await $fetch("/latency/ping", {
							method: "POST",
							body: { clientTimestamp: Date.now() },
						});
						const end = performance.now();
						latencies.push(end - start);
					}

					// Return median (more robust than average)
					if (latencies.length === 0) {
						return 0;
					}
					latencies.sort((a, b) => a - b);
					const mid = Math.floor(latencies.length / 2);
					if (latencies.length % 2 !== 0) {
						return latencies[mid] as number;
					}
					return (
						((latencies[mid - 1] as number) + (latencies[mid] as number)) / 2
					);
				},

				/**
				 * Get the user's latency history
				 *
				 * @param options.limit Maximum number of records to return
				 * @param options.flaggedOnly Only return flagged (suspicious) entries
				 * @param options.fetchOptions Fetch options including headers
				 */
				getHistory: async (options?: {
					limit?: number;
					flaggedOnly?: boolean;
					fetchOptions?: { headers?: Headers };
				}) => {
					return $fetch("/latency/history", {
						method: "GET",
						query: {
							limit: options?.limit?.toString(),
							flaggedOnly: options?.flaggedOnly?.toString(),
						},
						...options?.fetchOptions,
					});
				},

				/**
				 * Get the user's baseline latency profile
				 *
				 * @param options.fetchOptions Fetch options including headers
				 */
				getBaseline: async (options?: {
					fetchOptions?: { headers?: Headers };
				}) => {
					return $fetch("/latency/baseline", {
						method: "GET",
						...options?.fetchOptions,
					});
				},

				/**
				 * Get all flagged logins (admin only)
				 *
				 * @param options.limit Maximum number of records to return
				 * @param options.fetchOptions Fetch options including headers
				 */
				getFlagged: async (options?: {
					limit?: number;
					fetchOptions?: { headers?: Headers };
				}) => {
					return $fetch("/latency/flagged", {
						method: "GET",
						query: {
							limit: options?.limit?.toString(),
						},
						...options?.fetchOptions,
					});
				},
			},
		}),
	} satisfies BetterAuthClientPlugin;
};
