module.exports = {
	ci: {
		collect: {
			startServerCommand: "bun run start",
			startServerReadyPattern: "Ready",
			url: ["http://localhost:3000"],
			numberOfRuns: 3,
			settings: {
				preset: "desktop",
				onlyCategories: ["performance"],
			},
		},
		assert: {
			assertions: {
				"largest-contentful-paint": ["error", { maxNumericValue: 400 }],
				"total-blocking-time": ["error", { maxNumericValue: 200 }],
				"cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
			},
		},
		upload: {
			target: "temporary-public-storage",
		},
	},
};
