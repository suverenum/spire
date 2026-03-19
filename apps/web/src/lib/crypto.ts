import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a 256-bit key from the app secret using scrypt.
 * Salt is generated per encryption and stored alongside the ciphertext.
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
	return scryptSync(secret, salt, KEY_LENGTH);
}

function getSecret(): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret) throw new Error("SESSION_SECRET is required for encryption");
	return secret;
}

export interface EncryptedData {
	/** Base64-encoded: salt (16) + iv (12) + ciphertext + authTag (16) */
	data: string;
}

/**
 * Encrypts plaintext using AES-256-GCM with a key derived from SESSION_SECRET.
 * Returns a single base64 string containing salt + iv + ciphertext + authTag.
 */
export function encrypt(plaintext: string): string {
	const secret = getSecret();
	const salt = randomBytes(SALT_LENGTH);
	const key = deriveKey(secret, salt);
	const iv = randomBytes(IV_LENGTH);

	const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	// Pack: salt + iv + ciphertext + authTag
	const packed = Buffer.concat([salt, iv, encrypted, authTag]);
	return packed.toString("base64");
}

/**
 * Decrypts data encrypted by encrypt().
 * Throws if the key is wrong or data is tampered.
 */
export function decrypt(encryptedBase64: string): string {
	const secret = getSecret();
	const packed = Buffer.from(encryptedBase64, "base64");

	const salt = packed.subarray(0, SALT_LENGTH);
	const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
	const authTag = packed.subarray(packed.length - TAG_LENGTH);
	const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH, packed.length - TAG_LENGTH);

	const key = deriveKey(secret, salt);
	const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return decrypted.toString("utf8");
}
