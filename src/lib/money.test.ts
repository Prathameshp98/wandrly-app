import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  InvalidMoneyError,
  absMinor,
  exponentOf,
  formatMinorPlain,
  formatMoney,
  isNegative,
  isZero,
  parseMajorInput,
  parseMinor,
  sumMinor,
  toMinor,
} from './money';

/**
 * PRD §15.4 mandates the same rigour the backend applied. The three currencies
 * below are the ones that break naive implementations: JPY has no minor unit,
 * INR has two, BHD has three. Anything hardcoding /100 fails two of the three.
 */
const CURRENCIES = ['JPY', 'INR', 'BHD'] as const;

describe('exponentOf', () => {
  it('reads the exponent from the currency, not from an assumption', () => {
    expect(exponentOf('JPY')).toBe(0);
    expect(exponentOf('KRW')).toBe(0);
    expect(exponentOf('INR')).toBe(2);
    expect(exponentOf('USD')).toBe(2);
    expect(exponentOf('BHD')).toBe(3);
    expect(exponentOf('KWD')).toBe(3);
  });

  it('falls back to 2 for an unknown code rather than throwing mid-render', () => {
    expect(exponentOf('XXXXX')).toBe(2);
  });
});

describe('parseMinor', () => {
  it('parses integer strings to bigint', () => {
    expect(parseMinor('580000')).toBe(580000n);
    expect(parseMinor('0')).toBe(0n);
    expect(parseMinor('-4200')).toBe(-4200n);
  });

  it('survives values beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = '9007199254740993'; // 2^53 + 1
    expect(parseMinor(huge)).toBe(9007199254740993n);
    expect(toMinor(parseMinor(huge))).toBe(huge);
  });

  it('rejects anything that is not an integer string', () => {
    for (const bad of ['12.5', '', 'abc', '1e5', '1_000', ' 12', '+12']) {
      expect(() => parseMinor(bad)).toThrow(InvalidMoneyError);
    }
  });
});

describe('formatMoney', () => {
  it('formats each currency at its own exponent', () => {
    // ¥86,400 — zero-decimal, so the minor value IS the major value
    expect(formatMoney('86400', 'JPY', 'en-US')).toContain('86,400');
    expect(formatMoney('86400', 'JPY', 'en-US')).not.toContain('864.00');

    // ₹5,800.00 — two decimals
    expect(formatMoney('580000', 'INR', 'en-IN')).toContain('5,800.00');

    // BHD 5.800 — three decimals
    expect(formatMoney('5800', 'BHD', 'en-US')).toContain('5.800');
  });

  it('formats negatives without losing the sign', () => {
    expect(isNegative('-580000')).toBe(true);
    const formatted = formatMoney('-580000', 'INR', 'en-IN');
    expect(formatted).toMatch(/[-−]/);
    expect(formatted).toContain('5,800.00');
  });

  it('pads the fractional part', () => {
    expect(formatMoney('507', 'INR', 'en-IN')).toContain('5.07');
    expect(formatMoney('5', 'INR', 'en-IN')).toContain('0.05');
    expect(formatMoney('5', 'BHD', 'en-US')).toContain('0.005');
  });

  it('accepts a bigint as readily as a string', () => {
    expect(formatMoney(580000n, 'INR', 'en-IN')).toBe(formatMoney('580000', 'INR', 'en-IN'));
  });
});

describe('formatMinorPlain', () => {
  it('omits the symbol but keeps the currency exponent', () => {
    expect(formatMinorPlain('86400', 'JPY', 'en-US')).toBe('86,400');
    expect(formatMinorPlain('580000', 'INR', 'en-IN')).toBe('5,800.00');
    expect(formatMinorPlain('5800', 'BHD', 'en-US')).toBe('5.800');
    expect(formatMinorPlain('-507', 'INR', 'en-IN')).toBe('-5.07');
  });
});

describe('parseMajorInput', () => {
  it('converts typed major units to exact minor units', () => {
    expect(parseMajorInput('5800', 'INR')).toBe(580000n);
    expect(parseMajorInput('5800.00', 'INR')).toBe(580000n);
    expect(parseMajorInput('0.07', 'INR')).toBe(7n);
    expect(parseMajorInput('86400', 'JPY')).toBe(86400n);
    expect(parseMajorInput('5.800', 'BHD')).toBe(5800n);
    expect(parseMajorInput('-12.34', 'INR')).toBe(-1234n);
  });

  it('tolerates thousands separators and surrounding space', () => {
    expect(parseMajorInput(' 1,234.56 ', 'INR')).toBe(123456n);
  });

  it('refuses more precision than the currency has, rather than rounding silently', () => {
    expect(parseMajorInput('1.234', 'INR')).toBeNull();
    expect(parseMajorInput('1.5', 'JPY')).toBeNull();
    expect(parseMajorInput('1.2345', 'BHD')).toBeNull();
  });

  it('returns null for unparseable input', () => {
    for (const bad of ['', '   ', 'abc', '1.2.3', '$5', '--1']) {
      expect(parseMajorInput(bad, 'INR')).toBeNull();
    }
  });
});

describe('sumMinor and helpers', () => {
  it('sums without precision loss past 2^53', () => {
    expect(sumMinor(['9007199254740993', '1'])).toBe(9007199254740994n);
  });

  it('sums an empty list to zero', () => {
    expect(sumMinor([])).toBe(0n);
  });

  it('reports zero, sign and magnitude', () => {
    expect(isZero('0')).toBe(true);
    expect(isZero('1')).toBe(false);
    expect(isNegative('-1')).toBe(true);
    expect(absMinor('-4200')).toBe(4200n);
    expect(absMinor('4200')).toBe(4200n);
  });
});

describe('property: round-tripping never changes the amount', () => {
  it('parseMinor -> toMinor is identity for any integer string', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -(10n ** 18n), max: 10n ** 18n }), (amount) => {
        expect(parseMinor(toMinor(amount))).toBe(amount);
      }),
      { numRuns: 500 },
    );
  });

  it('parseMajorInput -> formatMinorPlain round-trips in every currency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CURRENCIES),
        fc.bigInt({ min: 0n, max: 10n ** 12n }),
        (currency, minor) => {
          const plain = formatMinorPlain(minor, currency, 'en-US');
          const reparsed = parseMajorInput(plain, currency, 'en-US');
          expect(reparsed).toBe(minor);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('sumMinor equals the bigint sum for any list', () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: -(10n ** 15n), max: 10n ** 15n }), { maxLength: 50 }),
        (amounts) => {
          const expected = amounts.reduce((total, amount) => total + amount, 0n);
          expect(sumMinor(amounts.map(String))).toBe(expected);
        },
      ),
      { numRuns: 300 },
    );
  });
});
