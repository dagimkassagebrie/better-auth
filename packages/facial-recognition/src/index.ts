import type { BetterAuthPlugin } from "@better-auth/core";
import { createAuthEndpoint } from "@better-auth/core/api";
import { sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import { APIError } from "better-call";
import * as z from "zod";
import { FACIAL_RECOGNITION_ERROR_CODES } from "./error-codes";
import { getSchema } from "./schema";
import type { FacialRecognitionOptions } from "./types";
import {
	compareFaceEmbeddings,
	extractFaceFeatures,
	hashFaceEmbedding,
	verifyFaceEmbedding,
} from "./utils";

interface FaceTemplate {
	id: string;
	userId: string;
	faceEmbedding: string;
	enrolledAt: Date;
	lastVerified: Date | null;
	version: string | null;
}

const enrollFaceBodySchema = z.object({
	faceData: z.string().meta({
		description: "Base64 encoded face image data",
	}),
});

const signInFacialBodySchema = z.object({
	email: z.string().email().meta({
		description: "User email address",
	}),
	faceData: z.string().meta({
		description: "Base64 encoded face image data",
	}),
	rememberMe: z
		.boolean()
		.meta({
			description: "Remember the user session",
		})
		.optional(),
});

const checkEnrollmentQuerySchema = z.object({});

export const facialRecognition = (options?: FacialRecognitionOptions) => {
	const opts = {
		threshold: options?.threshold ?? 0.85,
		rateLimit: options?.rateLimit ?? { window: 60, max: 5 },
		...options,
	} satisfies FacialRecognitionOptions;

	// Use custom face recognition or default
	const extractFeatures =
		options?.faceRecognition?.extractFeatures ?? extractFaceFeatures;
	const compareFaces =
		options?.faceRecognition?.compareFaces ?? compareFaceEmbeddings;

	return {
		id: "facial-recognition",
		schema: getSchema(),
		endpoints: {
			/**
			 * ### Endpoint
			 *
			 * POST `/facial/enroll`
			 *
			 * ### API Methods
			 *
			 * **server:**
			 * `auth.api.enrollFace`
			 *
			 * **client:**
			 * `authClient.facial.enroll`
			 */
			enrollFace: createAuthEndpoint(
				"/facial/enroll",
				{
					method: "POST",
					use: [sessionMiddleware],
					body: enrollFaceBodySchema,
					metadata: {
						openapi: {
							operationId: "enrollFace",
							description: "Enroll user's face for facial recognition",
							responses: {
								200: {
									description: "Success",
									content: {
										"application/json": {
											schema: {
												type: "object",
												properties: {
													success: {
														type: "boolean",
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				async (ctx) => {
					const { faceData } = ctx.body;
					const userId = ctx.context.session?.user.id;

					if (!userId) {
						throw new APIError("UNAUTHORIZED", {
							message: "User must be logged in to enroll face",
						});
					}

					// Extract face features
					let faceEmbedding: number[];
					try {
						faceEmbedding = await extractFeatures(faceData);
					} catch (error) {
						ctx.context.logger.error("Face extraction failed", error);
						throw new APIError("BAD_REQUEST", {
							message: FACIAL_RECOGNITION_ERROR_CODES.FACE_EXTRACTION_FAILED,
						});
					}

					// Encrypt and store face template
					const encryptedEmbedding = await hashFaceEmbedding(
						faceEmbedding,
						ctx.context.secret,
					);

					// Check if face template already exists
					const existingTemplate =
						await ctx.context.adapter.findOne<FaceTemplate>({
							model: "faceTemplate",
							where: [{ field: "userId", value: userId }],
						});

					if (existingTemplate) {
						// Update existing template
						await ctx.context.adapter.update({
							model: "faceTemplate",
							where: [{ field: "userId", value: userId }],
							update: {
								faceEmbedding: encryptedEmbedding,
								enrolledAt: new Date(),
								version: "1",
							},
						});
					} else {
						// Create new template
						await ctx.context.adapter.create({
							model: "faceTemplate",
							data: {
								userId,
								faceEmbedding: encryptedEmbedding,
								enrolledAt: new Date(),
								version: "1",
							},
						});
					}

					return ctx.json({
						success: true,
					});
				},
			),

			/**
			 * ### Endpoint
			 *
			 * POST `/sign-in/facial`
			 *
			 * ### API Methods
			 *
			 * **server:**
			 * `auth.api.signInFacial`
			 *
			 * **client:**
			 * `authClient.signIn.facial`
			 */
			signInFacial: createAuthEndpoint(
				"/sign-in/facial",
				{
					method: "POST",
					body: signInFacialBodySchema,
					metadata: {
						openapi: {
							operationId: "signInWithFacial",
							description: "Sign in with facial recognition",
							responses: {
								200: {
									description: "Success",
									content: {
										"application/json": {
											schema: {
												type: "object",
												properties: {
													user: {
														$ref: "#/components/schemas/User",
													},
													token: {
														type: "string",
													},
													similarity: {
														type: "number",
														description: "Face similarity score (0-1)",
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				async (ctx) => {
					const { email, faceData, rememberMe } = ctx.body;

					// Find user by email
					const user = await ctx.context.internalAdapter.findUserByEmail(
						email,
						{
							includeAccounts: true,
						},
					);

					if (!user) {
						// Extract features anyway to prevent timing attacks
						try {
							await extractFeatures(faceData);
						} catch {
							// Ignore extraction errors for timing attack prevention
						}
						ctx.context.logger.error("User not found", { email });
						throw new APIError("UNAUTHORIZED", {
							message: FACIAL_RECOGNITION_ERROR_CODES.FACE_NOT_ENROLLED,
						});
					}

					// Get stored face template
					const faceTemplate = await ctx.context.adapter.findOne<FaceTemplate>({
						model: "faceTemplate",
						where: [{ field: "userId", value: user.user.id }],
					});

					if (!faceTemplate) {
						// Extract features anyway to prevent timing attacks
						try {
							await extractFeatures(faceData);
						} catch {
							// Ignore extraction errors
						}
						ctx.context.logger.error("Face template not found", {
							email,
						});
						throw new APIError("BAD_REQUEST", {
							message: FACIAL_RECOGNITION_ERROR_CODES.FACE_NOT_ENROLLED,
						});
					}

					// Extract features from submitted face
					let submittedEmbedding: number[];
					try {
						submittedEmbedding = await extractFeatures(faceData);
					} catch (error) {
						ctx.context.logger.error("Face extraction failed", error);
						throw new APIError("BAD_REQUEST", {
							message: FACIAL_RECOGNITION_ERROR_CODES.FACE_EXTRACTION_FAILED,
						});
					}

					// Decrypt stored template
					let storedEmbedding: number[];
					try {
						storedEmbedding = await verifyFaceEmbedding(
							faceTemplate.faceEmbedding,
							ctx.context.secret,
						);
					} catch (error) {
						ctx.context.logger.error("Face template decryption failed", error);
						throw new APIError("INTERNAL_SERVER_ERROR", {
							message: "Failed to verify face template",
						});
					}

					// Compare faces
					const similarity = await compareFaces(
						submittedEmbedding,
						storedEmbedding,
					);

					// Check threshold
					if (similarity < opts.threshold) {
						ctx.context.logger.error("Face mismatch", {
							email,
							similarity,
							threshold: opts.threshold,
						});
						throw new APIError("UNAUTHORIZED", {
							message: FACIAL_RECOGNITION_ERROR_CODES.FACE_MISMATCH,
						});
					}

					// Face matches! Create session
					const session = await ctx.context.internalAdapter.createSession(
						user.user.id,
						rememberMe === false,
					);

					if (!session) {
						ctx.context.logger.error("Failed to create session");
						throw new APIError("INTERNAL_SERVER_ERROR", {
							message: "Failed to create session",
						});
					}

					// Set session cookie
					await setSessionCookie(
						ctx,
						{
							session,
							user: user.user,
						},
						rememberMe === false,
					);

					// Update last verified time
					await ctx.context.adapter.update({
						model: "faceTemplate",
						where: [{ field: "userId", value: user.user.id }],
						update: { lastVerified: new Date() },
					});

					return ctx.json({
						user: parseUserOutput(ctx.context.options, user.user),
						token: session.token,
						similarity,
					});
				},
			),

			/**
			 * ### Endpoint
			 *
			 * GET `/facial/check-enrollment`
			 *
			 * ### API Methods
			 *
			 * **server:**
			 * `auth.api.checkFaceEnrollment`
			 *
			 * **client:**
			 * `authClient.facial.checkEnrollment`
			 */
			checkFaceEnrollment: createAuthEndpoint(
				"/facial/check-enrollment",
				{
					method: "GET",
					use: [sessionMiddleware],
					query: checkEnrollmentQuerySchema,
					metadata: {
						openapi: {
							operationId: "checkFaceEnrollment",
							description: "Check if user has enrolled their face",
							responses: {
								200: {
									description: "Success",
									content: {
										"application/json": {
											schema: {
												type: "object",
												properties: {
													enrolled: {
														type: "boolean",
													},
													enrolledAt: {
														type: "string",
														format: "date-time",
														nullable: true,
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				async (ctx) => {
					const userId = ctx.context.session?.user.id;

					if (!userId) {
						throw new APIError("UNAUTHORIZED", {
							message: "User must be logged in",
						});
					}

					const faceTemplate = await ctx.context.adapter.findOne<FaceTemplate>({
						model: "faceTemplate",
						where: [{ field: "userId", value: userId }],
					});

					return ctx.json({
						enrolled: !!faceTemplate,
						enrolledAt: faceTemplate?.enrolledAt || null,
					});
				},
			),
		},
		rateLimit: [
			{
				pathMatcher(path) {
					return (
						path.startsWith("/facial/enroll") ||
						path.startsWith("/sign-in/facial")
					);
				},
				window: opts.rateLimit.window,
				max: opts.rateLimit.max,
			},
		],
		$ERROR_CODES: FACIAL_RECOGNITION_ERROR_CODES,
		options: opts,
	} satisfies BetterAuthPlugin;
};
