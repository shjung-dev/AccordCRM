import {
  formatCurrency,
  formatDate,
  formatTime,
  formatAttributeName,
  formatActivityTimestamp,
} from "../formatters";

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a negative amount", () => {
    const result = formatCurrency(-1234.56);
    expect(result).toContain("1,234.56");
  });

  it("formats a large amount with grouping separators", () => {
    const result = formatCurrency(1_000_000);
    expect(result).toContain("1,000,000");
  });

  it("rounds sub-cent precision", () => {
    const result = formatCurrency(9.999);
    expect(result).toContain("10.00");
  });

  it("uses default locale (en-SG) and currency (SGD)", () => {
    const result = formatCurrency(42);
    expect(result).toContain("$");
    expect(result).toContain("42.00");
  });

  it("accepts custom locale and currency", () => {
    const result = formatCurrency(1234.5, "en-US", "USD");
    expect(result).toContain("$");
    expect(result).toContain("1,234.50");
  });

  it("formats EUR currency", () => {
    const result = formatCurrency(100, "de-DE", "EUR");
    expect(result).toContain("100");
  });
});

describe("formatDate", () => {
  const shortOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  it("formats a valid ISO date string", () => {
    const result = formatDate("2024-01-15", shortOpts);
    expect(result).toContain("2024");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("returns the original string for an invalid date", () => {
    expect(formatDate("not-a-date", shortOpts)).toBe("not-a-date");
  });

  it("returns an empty string for an empty input", () => {
    expect(formatDate("", shortOpts)).toBe("");
  });

  it("handles a full ISO timestamp with timezone offset", () => {
    const result = formatDate("2024-06-01T12:30:00+08:00", shortOpts);
    expect(result).toContain("2024");
  });

  it("respects a custom locale", () => {
    const result = formatDate("2024-03-20", shortOpts, "en-GB");
    expect(result).toContain("Mar");
    expect(result).toContain("2024");
  });
});

describe("formatTime", () => {
  it("formats midnight as 00:00", () => {
    expect(formatTime("2024-01-01T00:00:00")).toBe("00:00");
  });

  it("formats end-of-day 23:59", () => {
    expect(formatTime("2024-12-31T23:59:00")).toBe("23:59");
  });

  it("formats a standard afternoon timestamp", () => {
    expect(formatTime("2024-06-15T14:30:00")).toBe("14:30");
  });

  it("pads single-digit hours", () => {
    expect(formatTime("2024-01-01T09:05:00")).toBe("09:05");
  });
});

describe("formatAttributeName", () => {
  it("converts underscores to spaces and capitalises words", () => {
    expect(formatAttributeName("first_name")).toBe("First Name");
  });

  it("returns an empty string for empty input", () => {
    expect(formatAttributeName("")).toBe("");
  });

  it("handles multiple consecutive underscores", () => {
    const result = formatAttributeName("a__b");
    expect(result).toBe("A  B");
  });

  it("handles leading/trailing underscores", () => {
    const result = formatAttributeName("_name_");
    expect(result).toContain("Name");
  });

  it("handles names containing numbers", () => {
    expect(formatAttributeName("field_2_value")).toBe("Field 2 Value");
  });

  it("capitalises a single word", () => {
    expect(formatAttributeName("email")).toBe("Email");
  });
});

describe("formatActivityTimestamp", () => {
  it("uses the default separator", () => {
    const result = formatActivityTimestamp("2024-03-15T10:30:00");
    expect(result).toContain(" | ");
    expect(result).toContain("10:30");
    expect(result).toMatch(/15 Mar 2024/);
  });

  it("accepts a custom separator", () => {
    const result = formatActivityTimestamp("2024-03-15T10:30:00", " - ");
    expect(result).toContain(" - ");
    expect(result).not.toContain(" | ");
  });

  it("pads single-digit days", () => {
    const result = formatActivityTimestamp("2024-01-05T08:00:00");
    expect(result).toMatch(/05 Jan 2024/);
  });
});
