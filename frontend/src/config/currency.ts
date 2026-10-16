/**
 * Display-only currency conversion.
 *
 * The actual charge is always NGN through Paystack. This table is what
 * lets a customer in Lagos, London or Accra see a familiar number in
 * the pricing grid, with the NGN amount shown as the small subtitle so
 * there is no surprise on the bank statement.
 *
 * Rates are fixed on purpose: a live FX call would add a network
 * dependency to a pricing page and could make the displayed price
 * fluctuate while the customer is reading it. Update the table when the
 * rates drift enough to matter (monthly is plenty).
 */
interface CurrencyRow {
  code: string;
  symbol: string;
  /** NGN per unit. 1 USD ≈ 1,500 NGN → rate: 1500. */
  ngnPerUnit: number;
}

const RATES: Record<string, CurrencyRow> = {
  NGN: { code: 'NGN', symbol: '\u20a6', ngnPerUnit: 1 },
  USD: { code: 'USD', symbol: '$', ngnPerUnit: 1500 },
  EUR: { code: 'EUR', symbol: '\u20ac', ngnPerUnit: 1650 },
  GBP: { code: 'GBP', symbol: '\u00a3', ngnPerUnit: 1900 },
  GHS: { code: 'GHS', symbol: '\u20b5', ngnPerUnit: 100 },
  ZAR: { code: 'ZAR', symbol: 'R', ngnPerUnit: 80 },
  KES: { code: 'KES', symbol: 'KSh', ngnPerUnit: 12 },
};

/** Locale-to-currency map. Only the regions we care about; anything else
 *  falls back to NGN, which is honest - the charge is NGN anyway. */
const LOCALE_TO_CURRENCY: Record<string, string> = {
  NG: 'NGN',
  US: 'USD',
  GB: 'GBP',
  IE: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  GH: 'GHS',
  ZA: 'ZAR',
  KE: 'KES',
};

/**
 * Detect the currency to display in. Reads the browser locale, extracts
 * the region, and looks it up. Falls back to NGN.
 */
export const detectDisplayCurrency = (): CurrencyRow => {
  if (typeof navigator === 'undefined') return RATES.NGN;
  const locale = navigator.language || 'en-NG';
  const region = locale.split('-')[1]?.toUpperCase() ?? '';
  const code = LOCALE_TO_CURRENCY[region] ?? 'NGN';
  return RATES[code];
};

/**
 * Convert an NGN kobo amount into a display string in the target currency.
 *
 * Whole-number rounding: a pricing grid that says "$5.03" reads worse
 * than one that says "$5". The NGN amount below it is the exact one.
 */
export const formatFromKobo = (kobo: number, target: CurrencyRow): string => {
  const ngn = kobo / 100;
  if (target.code === 'NGN') return target.symbol + ngn.toLocaleString();
  const converted = ngn / target.ngnPerUnit;
  const rounded = converted < 10 ? Math.round(converted * 10) / 10 : Math.round(converted);
  return target.symbol + rounded.toLocaleString();
};

/** The exact amount we charge, formatted for display under the local one. */
export const formatNgnExact = (kobo: number): string =>
  '\u20a6' + (kobo / 100).toLocaleString();
