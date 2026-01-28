export const FACIAL_RECOGNITION_ERROR_CODES = {
	FACE_NOT_ENROLLED: "Face template not found. Please enroll your face first.",
	FACE_MISMATCH: "Face does not match enrolled template.",
	FACE_EXTRACTION_FAILED: "Failed to extract face features from image.",
	NO_FACE_DETECTED: "No face detected in the provided image.",
	MULTIPLE_FACES_DETECTED:
		"Multiple faces detected. Please provide an image with a single face.",
} as const;
