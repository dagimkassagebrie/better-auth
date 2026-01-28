import { defineConfig } from "tsdown";

export default defineConfig({
	dts: { build: true, incremental: true },
	format: ["esm"],
	entry: ["./src/index.ts"],
	external: [
		"nanostores",
		"@better-auth/utils",
		"better-call",
		"@better-fetch/fetch",
		"@better-auth/core",
		"better-auth",
		"@tensorflow/tfjs-node",
		"@vladmandic/face-api",
		"sharp",
	],
	treeshake: true,
});
