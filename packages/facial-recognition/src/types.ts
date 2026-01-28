export interface FacialRecognitionOptions {
	/**
	 * Similarity threshold for face matching (0-1).
	 * Higher values require more exact matches.
	 * @default 0.85
	 */
	threshold?: number | undefined;
	/**
	 * Custom face recognition implementation.
	 * If not provided, uses default face-api.js implementation.
	 */
	faceRecognition?:
		| {
				extractFeatures: (imageData: string) => Promise<number[]>;
				compareFaces: (
					features1: number[],
					features2: number[],
				) => Promise<number>;
		  }
		| undefined;
	/**
	 * Rate limit configuration for enrollment and sign-in.
	 * @default {
	 *  window: 60,
	 *  max: 5,
	 * }
	 */
	rateLimit?:
		| {
				window: number;
				max: number;
		  }
		| undefined;
}
