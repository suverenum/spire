import { describe, expect, test } from "vitest";
import { getVendorByAddress, VENDOR_LIST, VENDORS } from "./vendors";

describe("vendors", () => {
	test("VENDORS has 5 entries", () => {
		expect(Object.keys(VENDORS)).toHaveLength(5);
	});

	test("VENDOR_LIST matches VENDORS values", () => {
		expect(VENDOR_LIST).toHaveLength(Object.keys(VENDORS).length);
	});

	test("each vendor has required fields", () => {
		for (const vendor of VENDOR_LIST) {
			expect(vendor.id).toBeTruthy();
			expect(vendor.name).toBeTruthy();
			expect(vendor.domain).toBeTruthy();
			expect(vendor.address).toMatch(/^0x[0-9a-fA-F]+$/);
			expect(vendor.description).toBeTruthy();
		}
	});

	test("getVendorByAddress finds vendor case-insensitively", () => {
		const vendor = getVendorByAddress("0x0000000000000000000000000000000000000001");
		expect(vendor?.id).toBe("openai");

		const upper = getVendorByAddress("0x0000000000000000000000000000000000000001");
		expect(upper?.id).toBe("openai");
	});

	test("getVendorByAddress returns undefined for unknown address", () => {
		expect(getVendorByAddress("0xdeadbeef")).toBeUndefined();
	});
});
