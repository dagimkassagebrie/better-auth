import type { BetterAuthPluginDBSchema } from "@better-auth/core/db";

export const getSchema = () => {
	return {
		faceTemplate: {
			fields: {
				userId: {
					type: "string",
					required: true,
					unique: true,
					index: true,
				},
				faceEmbedding: {
					type: "string",
					required: true,
				},
				enrolledAt: {
					type: "date",
					required: true,
				},
				lastVerified: {
					type: "date",
					required: false,
				},
				version: {
					type: "string",
					required: false,
				},
			},
		},
	} satisfies BetterAuthPluginDBSchema;
};

export type FacialRecognitionSchema = ReturnType<typeof getSchema>;
