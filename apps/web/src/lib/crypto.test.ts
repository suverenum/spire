import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { decrypt, encrypt } from "./crypto";

describe("crypto", () => {
	const originalEnv = process.env.SESSION_SECRET;

	beforeEach(() => {
		process.env.SESSION_SECRET = "test-secret-key-for-encryption-testing";
	});

	afterEach(() => {
		if (originalEnv) {
			process.env.SESSION_SECRET = originalEnv;
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
		process.env.SESSION_SECRET = "wrong-secret-key";
		expect(() => decrypt(encrypted)).toThrow();
	});

	test("decrypt fails with tampered data", () => {
		const encrypted = encrypt("secret data");
		const tampered = `${encrypted.slice(0, -4)}XXXX`;
		expect(() => decrypt(tampered)).toThrow();
	});

	test("throws if neither ENCRYPTION_SECRET nor SESSION_SECRET is set", () => {
		delete process.env.SESSION_SECRET;
		delete process.env.ENCRYPTION_SECRET;
		expect(() => encrypt("test")).toThrow("ENCRYPTION_SECRET");
	});

	test("prefers ENCRYPTION_SECRET over SESSION_SECRET", () => {
		process.env.ENCRYPTION_SECRET = "encryption-only-key";
		process.env.SESSION_SECRET = "session-only-key";
		const encrypted = encrypt("test data");
		// Decrypt with ENCRYPTION_SECRET should work
		expect(decrypt(encrypted)).toBe("test data");
		// Decrypt with only SESSION_SECRET should fail
		delete process.env.ENCRYPTION_SECRET;
		expect(() => decrypt(encrypted)).toThrow();
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
