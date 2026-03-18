import { seedTestData } from "./helpers/seed";

export default async function globalSetup() {
	console.log("[E2E] Seeding test database...");
	await seedTestData();
	console.log("[E2E] Database seeded.");
}
