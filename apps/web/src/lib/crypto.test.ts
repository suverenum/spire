import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { decrypt, encrypt } from "./crypto";

describe("crypto", () => {
	const originalEncryptionSecret = process.env.ENCRYPTION_SECRET;
	const originalSessionSecret = process.env.SESSION_SECRET;

	beforeEach(() => {
		process.env.ENCRYPTION_SECRET = "test-secret-key-for-encryption-testing";
		process.env.SESSION_SECRET = "session-secret-key-for-encryption-testing";
	});

	afterEach(() => {
		if (originalEncryptionSecret) {
			process.env.ENCRYPTION_SECRET = originalEncryptionSecret;
		} else {
			delete process.env.ENCRYPTION_SECRET;
		}
		if (originalSessionSecret) {
			process.env.SESSION_SECRET = originalSessionSecret;
		} else {
			delete process.env.SESSION_SECRET;
		}
	});

	test("encrypt returns a versioned base64 string", () => {
		const result = encrypt("hello world");
		expect(typeof result).toBe("string");
		// Verify versioned format: v1:<base64>
		expect(result.startsWith("v1:")).toBe(true);
		expect(() => Buffer.from(result.slice(3), "base64")).not.toThrow();
	});

	test("decrypt recovers original plaintext", () => {
		const plaintext = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
		const encrypted = encrypt(plaintext);
		const decrypted = decrypt(encrypted);
		expect(decrypted).toBe(plaintext);
	});

	test("each encryption produces different ciphertext (unique salt/iv)", () => {
		const plaintext = "same-input";
		const a = encrypt(plaintext);
		const b = encrypt(plaintext);
		expect(a).not.toBe(b);
		// But both decrypt to the same value
		expect(decrypt(a)).toBe(plaintext);
		expect(decrypt(b)).toBe(plaintext);
	});

	test("decrypt fails with wrong secret", () => {
		const encrypted = encrypt("secret data");
		process.env.ENCRYPTION_SECRET = "wrong-secret-key";
		expect(() => decrypt(encrypted)).toThrow();
	});

	test("decrypt fails with tampered data", () => {
		const encrypted = encrypt("secret data");
		const tampered = `${encrypted.slice(0, -4)}XXXX`;
		expect(() => decrypt(tampered)).toThrow();
	});

	test("throws if neither ENCRYPTION_SECRET nor SESSION_SECRET is set", () => {
		delete process.env.ENCRYPTION_SECRET;
		delete process.env.SESSION_SECRET;
		expect(() => encrypt("test")).toThrow("ENCRYPTION_SECRET");
	});

	test("falls back to SESSION_SECRET when ENCRYPTION_SECRET is not set", () => {
		delete process.env.ENCRYPTION_SECRET;
		process.env.SESSION_SECRET = "session-fallback-key";
		const encrypted = encrypt("legacy compat test");
		expect(decrypt(encrypted)).toBe("legacy compat test");
	});

	test("different ENCRYPTION_SECRET cannot decrypt", () => {
		delete process.env.SESSION_SECRET;
		const encrypted = encrypt("test data");
		process.env.ENCRYPTION_SECRET = "completely-different-key";
		expect(() => decrypt(encrypted)).toThrow();
	});

	test("decrypts legacy SESSION_SECRET data after ENCRYPTION_SECRET is introduced", () => {
		delete process.env.ENCRYPTION_SECRET;
		process.env.SESSION_SECRET = "legacy-session-secret";
		const encrypted = encrypt("legacy data");

		process.env.ENCRYPTION_SECRET = "new-encryption-secret";

		expect(decrypt(encrypted)).toBe("legacy data");
	});

	test("prefers ENCRYPTION_SECRET for newly encrypted data when both secrets are set", () => {
		process.env.ENCRYPTION_SECRET = "current-encryption-secret";
		process.env.SESSION_SECRET = "legacy-session-secret";
		const encrypted = encrypt("current data");

		process.env.SESSION_SECRET = "different-session-secret";

		expect(decrypt(encrypted)).toBe("current data");
	});

	test("decrypts legacy unversioned ciphertext", () => {
		// Simulate legacy format by stripping v1: prefix from new ciphertext
		// This tests backward compatibility
		const encrypted = encrypt("legacy data");
		const legacyFormat = encrypted.slice(3); // Remove "v1:"
		// Should still decrypt (backward compatible)
		expect(decrypt(legacyFormat)).toBe("legacy data");
	});
});
