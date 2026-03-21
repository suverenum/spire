/**
 * Shared environment variable loading for demo/deploy scripts.
 * All scripts should use these helpers instead of hardcoding secrets.
 */

export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`Missing required env var ${name}. Create a .env file in the scripts/demo/ directory or export it in your shell.`,
		);
	}
	return value;
}

export function requireHexKey(name: string): `0x${string}` {
	const value = requireEnv(name);
	if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
		throw new Error(`${name} must be a 66-char hex private key (0x + 64 hex chars)`);
	}
	return value as `0x${string}`;
}

export function requireAddress(name: string): `0x${string}` {
	const value = requireEnv(name);
	if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
		throw new Error(`${name} must be a 42-char hex address (0x + 40 hex chars)`);
	}
	return value as `0x${string}`;
}
