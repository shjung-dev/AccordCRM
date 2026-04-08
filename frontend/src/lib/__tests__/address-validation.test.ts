import {
  normalizeCountry,
  validatePostalCodeForCountry,
  getStateOptions,
  validateStateForCountry,
} from "../address-validation";

// ── normalizeCountry ────────────────────────────────────────────────────

describe("normalizeCountry", () => {
  it("returns alpha-2 for a valid alpha-2 code", () => {
    expect(normalizeCountry("SG")).toBe("SG");
    expect(normalizeCountry("US")).toBe("US");
  });

  it("is case-insensitive for alpha-2 codes", () => {
    expect(normalizeCountry("sg")).toBe("SG");
    expect(normalizeCountry("Us")).toBe("US");
  });

  it("converts alpha-3 codes to alpha-2", () => {
    expect(normalizeCountry("USA")).toBe("US");
    expect(normalizeCountry("SGP")).toBe("SG");
    expect(normalizeCountry("GBR")).toBe("GB");
  });

  it("converts full country names to alpha-2", () => {
    expect(normalizeCountry("Singapore")).toBe("SG");
    expect(normalizeCountry("United States of America")).toBe("US");
  });

  it("resolves manual aliases", () => {
    expect(normalizeCountry("america")).toBe("US");
    expect(normalizeCountry("u.s.a.")).toBe("US");
    expect(normalizeCountry("u.s.")).toBe("US");
    expect(normalizeCountry("uk")).toBe("GB");
    expect(normalizeCountry("u.k.")).toBe("GB");
    expect(normalizeCountry("england")).toBe("GB");
    expect(normalizeCountry("great britain")).toBe("GB");
    expect(normalizeCountry("korea")).toBe("KR");
    expect(normalizeCountry("prc")).toBe("CN");
    expect(normalizeCountry("brasil")).toBe("BR");
    expect(normalizeCountry("chinese taipei")).toBe("TW");
    expect(normalizeCountry("aotearoa")).toBe("NZ");
  });

  it("handles mixed case for aliases", () => {
    expect(normalizeCountry("America")).toBe("US");
    expect(normalizeCountry("ENGLAND")).toBe("GB");
  });

  it("returns null for empty string", () => {
    expect(normalizeCountry("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(normalizeCountry("   ")).toBeNull();
  });

  it("returns null for bogus input", () => {
    expect(normalizeCountry("xyzzy")).toBeNull();
    expect(normalizeCountry("NotACountry123")).toBeNull();
  });

  it("returns null for invalid two-letter codes", () => {
    expect(normalizeCountry("XX")).toBeNull();
    expect(normalizeCountry("ZZ")).toBeNull();
  });
});

// ── validatePostalCodeForCountry ────────────────────────────────────────

describe("validatePostalCodeForCountry", () => {
  it("accepts a valid Singapore postal code", () => {
    const result = validatePostalCodeForCountry("123456", "SG");
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid Singapore postal code", () => {
    const result = validatePostalCodeForCountry("12345", "SG");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Invalid postal code");
    expect(result.message).toContain("123456"); // format example
  });

  it("accepts a valid US zip code", () => {
    expect(validatePostalCodeForCountry("90210", "US").valid).toBe(true);
  });

  it("accepts a valid US zip+4 code", () => {
    expect(validatePostalCodeForCountry("90210-1234", "US").valid).toBe(true);
  });

  it("rejects an invalid US zip code", () => {
    const result = validatePostalCodeForCountry("ABCDE", "US");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("12345 or 12345-6789");
  });

  it("returns required error for empty postal code", () => {
    const result = validatePostalCodeForCountry("", "SG");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Postal code is required");
  });

  it("returns required error for whitespace-only postal code", () => {
    const result = validatePostalCodeForCountry("   ", "SG");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Postal code is required");
  });

  it("always accepts Hong Kong (no postal codes)", () => {
    expect(validatePostalCodeForCountry("anything", "HK").valid).toBe(true);
    expect(validatePostalCodeForCountry("999077", "Hong Kong").valid).toBe(true);
  });

  it("uses generic fallback for unknown country (4-10 chars)", () => {
    // Use a bogus country so normalization returns null
    const result = validatePostalCodeForCountry("12345", "XZ");
    // XZ is not a valid country, normalizeCountry returns null → generic fallback
    expect(result.valid).toBe(true);
  });

  it("rejects too-short codes for unknown country", () => {
    const result = validatePostalCodeForCountry("12", "XZ");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("between 4 and 10");
  });

  it("rejects too-long codes for unknown country", () => {
    const result = validatePostalCodeForCountry("12345678901", "XZ");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("between 4 and 10");
  });
});

// ── getStateOptions ─────────────────────────────────────────────────────

describe("getStateOptions", () => {
  it("returns states for a country with states (US)", () => {
    const states = getStateOptions("US");
    expect(states).not.toBeNull();
    expect(states!.length).toBeGreaterThan(0);
    expect(states![0]).toHaveProperty("value");
    expect(states![0]).toHaveProperty("label");
  });

  it("returns states for SG (has CDCs)", () => {
    const states = getStateOptions("SG");
    expect(states).not.toBeNull();
    expect(states!.length).toBeGreaterThan(0);
  });

  it("returns null for empty input", () => {
    expect(getStateOptions("")).toBeNull();
  });

  it("returns null for invalid country", () => {
    expect(getStateOptions("XZ")).toBeNull();
  });
});

// ── validateStateForCountry ─────────────────────────────────────────────

describe("validateStateForCountry", () => {
  it("accepts a valid US state", () => {
    const result = validateStateForCountry("California", "US");
    expect(result.valid).toBe(true);
  });

  it("matches state name case-insensitively", () => {
    const result = validateStateForCountry("california", "US");
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid state for a country with states", () => {
    const result = validateStateForCountry("Narnia", "US");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("valid state/province");
    expect(result.message).toContain("United States");
  });

  it("returns required error for empty state", () => {
    const result = validateStateForCountry("", "US");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("State is required");
  });

  it("returns required error for whitespace-only state", () => {
    const result = validateStateForCountry("   ", "US");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("State is required");
  });

  it("uses generic fallback for unknown country", () => {
    const result = validateStateForCountry("SomeState", "XZ");
    expect(result.valid).toBe(true);
  });

  it("rejects too-short state in generic fallback", () => {
    const result = validateStateForCountry("A", "XZ");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("at least 2 characters");
  });
});
