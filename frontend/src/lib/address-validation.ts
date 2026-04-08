import * as countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { State } from "country-state-city";
import {
  postcodeValidator,
  postcodeValidatorExistsForCountry,
} from "postcode-validator";

// Register English locale for country name lookups
countries.registerLocale(enLocale);

export interface StateOption {
  value: string;
  label: string;
}

// ── Country normalization ────────────────────────────────────────────
// Small alias map for abbreviations / variants the package doesn't handle
const MANUAL_ALIASES: Record<string, string> = {
  "u.s.": "US",
  "u.s.a.": "US",
  america: "US",
  uk: "GB",
  "u.k.": "GB",
  england: "GB",
  "great britain": "GB",
  korea: "KR",
  prc: "CN",
  brasil: "BR",
  "chinese taipei": "TW",
  aotearoa: "NZ",
};

export function normalizeCountry(country: string): string | null {
  const trimmed = country.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // 1. Check manual aliases first (common abbreviations)
  if (MANUAL_ALIASES[lower]) return MANUAL_ALIASES[lower];

  // 2. Check if input is already a valid alpha-2 code (e.g. "SG", "US")
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && countries.isValid(upper)) return upper;

  // 3. Check if input is a valid alpha-3 code (e.g. "USA", "SGP")
  if (upper.length === 3 && countries.isValid(upper)) {
    const alpha2 = countries.alpha3ToAlpha2(upper);
    if (alpha2) return alpha2;
  }

  // 4. Try the package's name → code lookup (handles full names like "United States of America")
  const code = countries.getAlpha2Code(trimmed, "en");
  if (code) return code;

  return null;
}

// ── Postal code validation ───────────────────────────────────────────
// Format examples for common countries (postcode-validator only returns boolean)
const POSTAL_FORMAT_EXAMPLES: Record<string, string> = {
  US: "12345 or 12345-6789",
  GB: "SW1A 1AA",
  CA: "K1A 0B1",
  AU: "2000",
  SG: "123456",
  IN: "110001",
  MY: "50000",
  JP: "100-0001",
  DE: "10115",
  FR: "75001",
  BR: "01001-000",
  CN: "100000",
  NZ: "6011",
  KR: "03171",
};

export function validatePostalCodeForCountry(
  postalCode: string,
  country: string
): { valid: boolean; message?: string } {
  const trimmed = postalCode.trim();
  if (!trimmed) return { valid: false, message: "Postal code is required" };

  const code = normalizeCountry(country);

  // Hong Kong special case — no postal codes
  if (code === "HK") return { valid: true };

  if (code && postcodeValidatorExistsForCountry(code)) {
    if (!postcodeValidator(trimmed, code)) {
      const label = countries.getName(code, "en") ?? country;
      const example = POSTAL_FORMAT_EXAMPLES[code];
      const message = example
        ? `Invalid postal code format for ${label}. Expected format: ${example}`
        : `Invalid postal code format for ${label}`;
      return { valid: false, message };
    }
    return { valid: true };
  }

  // Generic fallback for countries without a validator
  if (trimmed.length < 4 || trimmed.length > 10) {
    return {
      valid: false,
      message: "Postal code must be between 4 and 10 characters",
    };
  }
  return { valid: true };
}

// ── State/province lists ─────────────────────────────────────────────
export function getStateOptions(country: string): StateOption[] | null {
  const code = normalizeCountry(country);
  if (!code) return null;

  const states = State.getStatesOfCountry(code);
  if (!states || states.length === 0) return null;

  return states.map((s) => ({ value: s.name, label: s.name }));
}

export function validateStateForCountry(
  state: string,
  country: string
): { valid: boolean; message?: string } {
  const trimmed = state.trim();
  if (!trimmed) return { valid: false, message: "State is required" };

  const code = normalizeCountry(country);
  if (code) {
    const states = State.getStatesOfCountry(code);
    if (states && states.length > 0) {
      const match = states.some(
        (s) => s.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!match) {
        const label = countries.getName(code, "en") ?? country;
        return {
          valid: false,
          message: `Please select a valid state/province for ${label}`,
        };
      }
      return { valid: true };
    }
  }

  // Generic fallback
  if (trimmed.length < 2)
    return { valid: false, message: "State must be at least 2 characters" };
  return { valid: true };
}
