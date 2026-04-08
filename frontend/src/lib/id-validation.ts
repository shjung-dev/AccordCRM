import validator from "validator";
import { normalizeCountry } from "@/lib/address-validation";

/**
 * Mapping from ISO 3166-1 alpha-2 country codes to the locale string
 * accepted by validator.isIdentityCard().
 *
 * Countries whose locale string differs from the alpha-2 code
 * (e.g. China → "zh-CN") are mapped explicitly; countries where
 * the alpha-2 code IS the locale string (e.g. "ES") are also
 * listed for clarity and to serve as the allowlist.
 */
const COUNTRY_TO_LOCALE: Record<string, string> = {
  ES: "ES",
  FI: "FI",
  IN: "IN",
  IR: "IR",
  IT: "IT",
  LK: "LK",
  MZ: "MZ",
  NO: "NO",
  PK: "PK",
  PL: "PL",
  TH: "TH",
  CN: "zh-CN",
  TW: "zh-TW",
  IL: "he",
  LY: "ar-LY",
  TN: "ar-TN",
};

/**
 * Custom validators for countries that validator.js does not support
 * but that the system must handle (existing business rule).
 *
 * Singapore NRIC / FIN format: one letter from [STFGM], 7 digits,
 * one uppercase letter.  Example: S1234567A
 */
const CUSTOM_VALIDATORS: Record<string, (id: string) => boolean> = {
  SG: (id) => /^[STFGM]\d{7}[A-Z]$/i.test(id),
};

export interface IdValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate an identification number against the client's country.
 *
 * @param idNumber  – the raw identification string entered by the user
 * @param country   – a country name *or* ISO alpha-2 code (e.g. "Singapore" or "SG")
 *
 * Resolution order:
 *   1. Custom validator (e.g. SG) – used when validator.js has no locale
 *   2. validator.isIdentityCard with the mapped locale
 *   3. Reject with a clear "not supported" message
 */
export function validateIdentificationNumber(
  idNumber: string,
  country: string,
): IdValidationResult {
  const trimmed = idNumber.trim();
  if (!trimmed) {
    return { valid: false, message: "Identification number is required" };
  }

  const code = normalizeCountry(country);
  if (!code) {
    return {
      valid: false,
      message: "Please enter a valid country for identification number verification",
    };
  }

  // 1. Custom validator (e.g. Singapore)
  if (CUSTOM_VALIDATORS[code]) {
    if (!CUSTOM_VALIDATORS[code](trimmed)) {
      return {
        valid: false,
        message: `Invalid identification number format for ${country}`,
      };
    }
    return { valid: true };
  }

  // 2. validator.js locale
  const locale = COUNTRY_TO_LOCALE[code];
  if (!locale) {
    return {
      valid: false,
      message: `Identification number validation is not supported for country: ${country}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!validator.isIdentityCard(trimmed, locale as any)) {
    return {
      valid: false,
      message: `Invalid identification number format for ${country}`,
    };
  }

  return { valid: true };
}

/**
 * Returns true when the given country code (or name) has a configured
 * identity-card validator – either a custom one or a validator.js locale.
 */
export function isIdValidationSupported(country: string): boolean {
  const code = normalizeCountry(country);
  if (!code) return false;
  return code in CUSTOM_VALIDATORS || code in COUNTRY_TO_LOCALE;
}
