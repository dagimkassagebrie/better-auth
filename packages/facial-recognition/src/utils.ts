import { BetterAuthError } from "@better-auth/core/error";
import { base64 } from "@better-auth/utils/base64";
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";

// Initialize face-api models (lazy loaded)
let modelsLoaded = false;

/**
 * Load face-api.js models (lazy initialization)
 * Models are loaded from CDN on first use
 */
async function loadModels(): Promise<void> {
	if (modelsLoaded) {
		return;
	}

	try {
		const tf = await import("@tensorflow/tfjs-node");
		const faceapi = await import("@vladmandic/face-api");

		// Set TensorFlow backend for Node.js
		await tf.ready();

		// Load models from CDN
		// These will be downloaded and cached on first use
		const modelPath =
			"https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/model";

		await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
		await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
		await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);

		modelsLoaded = true;
	} catch (error) {
		throw new BetterAuthError(
			`Failed to load face recognition models: ${error instanceof Error ? error.message : String(error)}. Make sure @tensorflow/tfjs-node, @vladmandic/face-api, and sharp are installed.`,
		);
	}
}

/**
 * Extract face features from image data using face-api.js
 * Uses sharp for image processing and TensorFlow tensors for face-api
 */
export async function extractFaceFeatures(
	imageData: string,
): Promise<number[]> {
	// Ensure models are loaded
	await loadModels();

	let tf: typeof import("@tensorflow/tfjs-node");
	let faceapi: typeof import("@vladmandic/face-api");
	let sharp: typeof import("sharp");

	try {
		tf = await import("@tensorflow/tfjs-node");
		faceapi = await import("@vladmandic/face-api");
		const sharpModule = await import("sharp");
		sharp = sharpModule.default as typeof import("sharp");
	} catch {
		throw new BetterAuthError(
			"Missing dependencies for facial recognition. Install: @tensorflow/tfjs-node @vladmandic/face-api sharp",
		);
	}

	try {
		// Convert base64 to Uint8Array
		const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
		const imageBuffer = base64.decode(base64Data);

		// Use sharp to decode image and get raw pixel data
		const { data, info } = await sharp(imageBuffer)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		// Create TensorFlow tensor from image data
		// Shape: [1, height, width, channels] where channels = 4 (RGBA)
		const pixelData = new Float32Array(data);
		const imageTensor = tf.tensor4d(pixelData as unknown as number[], [
			1,
			info.height,
			info.width,
			info.channels,
		]);

		// Convert tensor to format face-api expects
		const detections = await faceapi
			.detectAllFaces(imageTensor as never)
			.withFaceLandmarks()
			.withFaceDescriptors();

		// Clean up tensor
		imageTensor.dispose();

		if (detections.length === 0) {
			throw new BetterAuthError("No face detected in image");
		}

		if (detections.length > 1) {
			throw new BetterAuthError(
				"Multiple faces detected. Please provide an image with a single face.",
			);
		}

		// Get face descriptor (128-dimensional vector)
		const descriptor = detections[0]!.descriptor;

		// Convert Float32Array to number array
		return Array.from(descriptor);
	} catch (error) {
		if (error instanceof BetterAuthError) {
			throw error;
		}
		throw new BetterAuthError(
			`Face extraction failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Compare two face embeddings and return similarity score (0-1).
 */
export async function compareFaceEmbeddings(
	embedding1: number[],
	embedding2: number[],
): Promise<number> {
	if (embedding1.length !== embedding2.length) {
		return 0;
	}

	// Calculate cosine similarity
	let dotProduct = 0;
	let norm1 = 0;
	let norm2 = 0;

	for (let i = 0; i < embedding1.length; i++) {
		dotProduct += embedding1[i]! * embedding2[i]!;
		norm1 += embedding1[i]! * embedding1[i]!;
		norm2 += embedding2[i]! * embedding2[i]!;
	}

	const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
	if (magnitude === 0) {
		return 0;
	}

	return dotProduct / magnitude;
}

/**
 * Hash (encrypt) face embedding for storage.
 */
export async function hashFaceEmbedding(
	embedding: number[],
	secret: string,
): Promise<string> {
	// Convert embedding to JSON string
	const embeddingJson = JSON.stringify(embedding);

	// Encrypt the embedding using the secret
	const encrypted = await symmetricEncrypt({
		key: secret,
		data: embeddingJson,
	});

	return encrypted;
}

/**
 * Verify (decrypt) face embedding from storage.
 */
export async function verifyFaceEmbedding(
	encrypted: string,
	secret: string,
): Promise<number[]> {
	// Decrypt the embedding
	const decrypted = await symmetricDecrypt({
		key: secret,
		data: encrypted,
	});

	// Parse back to number array
	return JSON.parse(decrypted) as number[];
}
