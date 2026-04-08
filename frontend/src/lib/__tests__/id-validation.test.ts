import {
  validateIdentificationNumber,
  isIdValidationSupported,
} from "../id-validation";

// ── validateIdentificationNumber ────────────────────────────────────────

describe("validateIdentificationNumber", () => {
  it("accepts a valid SG NRIC", () => {
    const result = validateIdentificationNumber("S1234567A", "SG");
    expect(result.valid).toBe(true);
  });

  it("accepts SG NRIC case-insensitively", () => {
    const result = validateIdentificationNumber("s1234567a", "Singapore");
    expect(result.valid).toBe(true);
  });

  it("rejects SG NRIC with wrong prefix letter", () => {
    const result = validateIdentificationNumber("X1234567A", "SG");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Invalid identification number");
  });

  it("rejects SG NRIC that is too short", () => {
    const result = validateIdentificationNumber("S123456A", "SG");
    expect(result.valid).toBe(false);
  });

  it("rejects SG NRIC that is too long", () => {
    const result = validateIdentificationNumber("S12345678A", "SG");
    expect(result.valid).toBe(false);
  });

  it("returns required error for empty input", () => {
    const result = validateIdentificationNumber("", "SG");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Identification number is required");
  });

  it("returns required error for whitespace-only input", () => {
    const result = validateIdentificationNumber("   ", "SG");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Identification number is required");
  });

  it("returns invalid country error for bogus country", () => {
    const result = validateIdentificationNumber("12345", "XyzLand");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("valid country");
  });

  it('returns "not supported" for unsupported country', () => {
    const result = validateIdentificationNumber("12345", "Japan");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("not supported");
  });

  it("validates via validator.js for supported locale countries (Spain)", () => {
    // Spanish DNI: 8 digits + letter
    const valid = validateIdentificationNumber("12345678Z", "Spain");
    expect(valid.valid).toBe(true);

    const invalid = validateIdentificationNumber("INVALID", "Spain");
    expect(invalid.valid).toBe(false);
    expect(invalid.message).toContain("Invalid identification number");
  });

  it("accepts all SG NRIC prefix letters: S, T, F, G, M", () => {
    for (const prefix of ["S", "T", "F", "G", "M"]) {
      const result = validateIdentificationNumber(
        `${prefix}1234567A`,
        "SG"
      );
      expect(result.valid).toBe(true);
    }
  });
});

// ── isIdValidationSupported ─────────────────────────────────────────────

describe("isIdValidationSupported", () => {
  it("returns true for SG (custom validator)", () => {
    expect(isIdValidationSupported("SG")).toBe(true);
    expect(isIdValidationSupported("Singapore")).toBe(true);
  });

  it("returns true for Spain (validator.js locale)", () => {
    expect(isIdValidationSupported("ES")).toBe(true);
    expect(isIdValidationSupported("Spain")).toBe(true);
  });

  it("returns false for empty input", () => {
    expect(isIdValidationSupported("")).toBe(false);
  });

  it("returns false for unsupported country", () => {
    expect(isIdValidationSupported("Japan")).toBe(false);
    expect(isIdValidationSupported("AU")).toBe(false);
  });
});
