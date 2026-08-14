/**
 * The only place money is converted.
 *
 * Every monetary value crosses the wire as an integer in the currency's minor
 * units, encoded as a string: `"580000"` is ₹5,800.00 and `"86400"` is ¥86,400.
 * JSON has no bigint and `Number` loses precision above 2^53, so amounts are
 * never numbers — see API_CONTRACT §3.2 and FR-SPLIT-16.
 *
 * Two rules this module exists to enforce:
 *
 *   1. Parse to `bigint`, never to `Number`.
 *   2. Never hardcode `/100`. JPY and KRW have no minor unit; BHD and KWD have
 *      three. The exponent comes from `Intl.NumberFormat`, which knows.
 *
 * Never sum, split or net money here for anything the user acts on. `/balances`
 * and `/settle-up` are authoritative and exact. The split editor may preview a
 * delta (FR-SPLIT-11), but the server is the gate.
 */

/** Thrown when a wire value is not a valid minor-unit integer string. */
export class InvalidMoneyError extends Error {
  constructor(readonly value: string) {
    super(`"${value}" is not a valid minor-unit amount — expected an integer string`);
    this.name = 'InvalidMoneyError';
  }
}

const MINOR_PATTERN = /^-?\d+$/;

/** Wire format is a decimal string in minor units. Parse to bigint, never Number. */
export function parseMinor(value: string): bigint {
  if (typeof value !== 'string' || !MINOR_PATTERN.test(value)) {
    throw new InvalidMoneyError(String(value));
  }
  return BigInt(value);
}

/** Serialise back to the wire format. */
export function toMinor(value: bigint): string {
  return value.toString();
}

/**
 * How many minor units make one major unit of this currency.
 * `Intl` is the source of truth: JPY resolves to 0, INR to 2, BHD to 3.
 */
export function exponentOf(currency: string, locale = 'en-IN'): number {
  try {
    const resolved = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).resolvedOptions();
    return resolved.maximumFractionDigits ?? 2;
  } catch {
    // An unknown currency code should not crash a render; 2 is the common case
    // and the server's own formatting remains authoritative for display copy.
    return 2;
  }
}

function divisorFor(currency: string, locale?: string): bigint {
  return 10n ** BigInt(exponentOf(currency, locale));
}

/**
 * Format a minor-unit amount for display, using the currency's own exponent.
 *
 * The split into whole and fractional parts happens in bigint, so precision is
 * only ever lost at the final `Number()` — by which point the value is bounded
 * by the currency's exponent and safe.
 */
export function formatMoney(minor: string | bigint, currency: string, locale = 'en-IN'): string {
  const amount = typeof minor === 'bigint' ? minor : parseMinor(minor);
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const divisor = divisorFor(currency, locale);

  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / divisor;
  const fraction = absolute % divisor;

  const exponent = exponentOf(currency, locale);
  const asDecimal =
    exponent === 0 ? `${whole}` : `${whole}.${fraction.toString().padStart(exponent, '0')}`;

  return formatter.format(negative ? -Number(asDecimal) : Number(asDecimal));
}

/**
 * Format without the currency symbol — for table cells and inputs where the
 * currency is already named in a column header or adjacent control.
 */
export function formatMinorPlain(
  minor: string | bigint,
  currency: string,
  locale = 'en-IN',
): string {
  const exponent = exponentOf(currency, locale);
  const amount = typeof minor === 'bigint' ? minor : parseMinor(minor);
  const divisor = divisorFor(currency, locale);

  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });

  const asDecimal =
    exponent === 0
      ? `${absolute / divisor}`
      : `${absolute / divisor}.${(absolute % divisor).toString().padStart(exponent, '0')}`;

  return `${negative ? '-' : ''}${formatter.format(Number(asDecimal))}`;
}

/**
 * Parse user input in major units into minor units, exactly.
 *
 * Done on the string so `"0.07"` cannot become `7.000000000000001`. Returns
 * null for anything unparseable so callers can surface a field error rather
 * than submit a wrong number.
 */
export function parseMajorInput(input: string, currency: string, locale = 'en-IN'): bigint | null {
  const trimmed = input.trim().replace(/[\s,]/g, '');
  if (trimmed === '' || !/^-?\d*(\.\d*)?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholeRaw = '', fractionRaw = ''] = unsigned.split('.');

  const exponent = exponentOf(currency, locale);
  // More precision than the currency has is a user error, not something to round
  // away silently — a stray digit would change the amount they think they typed.
  if (fractionRaw.length > exponent) return null;

  const whole = wholeRaw === '' ? 0n : BigInt(wholeRaw);
  const fraction = exponent === 0 ? 0n : BigInt(fractionRaw.padEnd(exponent, '0') || '0');

  const total = whole * 10n ** BigInt(exponent) + fraction;
  return negative ? -total : total;
}

/** Sum minor-unit amounts. For previews only — the server's total is authoritative. */
export function sumMinor(amounts: Array<string | bigint>): bigint {
  return amounts.reduce<bigint>(
    (total, amount) => total + (typeof amount === 'bigint' ? amount : parseMinor(amount)),
    0n,
  );
}

export function isZero(minor: string | bigint): boolean {
  return (typeof minor === 'bigint' ? minor : parseMinor(minor)) === 0n;
}

export function isNegative(minor: string | bigint): boolean {
  return (typeof minor === 'bigint' ? minor : parseMinor(minor)) < 0n;
}

export function absMinor(minor: string | bigint): bigint {
  const amount = typeof minor === 'bigint' ? minor : parseMinor(minor);
  return amount < 0n ? -amount : amount;
}
