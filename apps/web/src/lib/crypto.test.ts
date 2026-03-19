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

	test("encrypt returns a base64 string", () => {
		const result = encrypt("hello world");
		expect(typeof result).toBe("string");
		// Verify it's valid base64
		expect(() => Buffer.from(result, "base64")).not.toThrow();
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

	test("throws if SESSION_SECRET is not set", () => {
		delete process.env.SESSION_SECRET;
		expect(() => encrypt("test")).toThrow("SESSION_SECRET is required");
	});
});
