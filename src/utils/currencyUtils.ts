// ---------------------------------------------------------------------------
// Supported currencies
// ---------------------------------------------------------------------------

/**
 * ISO 4217 currency codes supported by the app.
 * Ordered by global prevalence / likely user base.
 */
export const SUPPORTED_CURRENCIES: string[] = [
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound Sterling
  'JPY', // Japanese Yen
  'SGD', // Singapore Dollar
  'THB', // Thai Baht
  'MMK', // Myanmar Kyat
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
  'CNY', // Chinese Yuan
  'HKD', // Hong Kong Dollar
  'INR', // Indian Rupee
  'IDR', // Indonesian Rupiah
  'KRW', // South Korean Won
  'MYR', // Malaysian Ringgit
  'NZD', // New Zealand Dollar
  'PHP', // Philippine Peso
  'TWD', // Taiwan New Dollar
  'VND', // Vietnamese Dong
  'BDT', // Bangladeshi Taka
  'PKR', // Pakistani Rupee
  'LKR', // Sri Lankan Rupee
  'NPR', // Nepalese Rupee
  'AED', // UAE Dirham
  'SAR', // Saudi Riyal
  'TRY', // Turkish Lira
  'ZAR', // South African Rand
  'BRL', // Brazilian Real
  'MXN', // Mexican Peso
  'SEK', // Swedish Krona
  'NOK', // Norwegian Krone
  'DKK', // Danish Krone
  'PLN', // Polish Zloty
  'CZK', // Czech Koruna
  'HUF', // Hungarian Forint
  'RUB', // Russian Ruble
  'UAH', // Ukrainian Hryvnia
];

// ---------------------------------------------------------------------------
// Currency metadata map
// ---------------------------------------------------------------------------

interface CurrencyMeta {
  symbol: string;
  /** Number of decimal places used when displaying amounts */
  decimals: number;
  /** Whether the symbol appears before or after the amount */
  symbolPosition: 'before' | 'after';
}

const CURRENCY_META: Record<string, CurrencyMeta> = {
  USD: { symbol: '$',    decimals: 2, symbolPosition: 'before' },
  EUR: { symbol: '€',    decimals: 2, symbolPosition: 'before' },
  GBP: { symbol: '£',    decimals: 2, symbolPosition: 'before' },
  JPY: { symbol: '¥',    decimals: 0, symbolPosition: 'before' },
  SGD: { symbol: 'S$',   decimals: 2, symbolPosition: 'before' },
  THB: { symbol: '฿',    decimals: 2, symbolPosition: 'before' },
  MMK: { symbol: 'K',    decimals: 0, symbolPosition: 'before' },
  AUD: { symbol: 'A$',   decimals: 2, symbolPosition: 'before' },
  CAD: { symbol: 'CA$',  decimals: 2, symbolPosition: 'before' },
  CHF: { symbol: 'CHF',  decimals: 2, symbolPosition: 'before' },
  CNY: { symbol: '¥',    decimals: 2, symbolPosition: 'before' },
  HKD: { symbol: 'HK$',  decimals: 2, symbolPosition: 'before' },
  INR: { symbol: '₹',    decimals: 2, symbolPosition: 'before' },
  IDR: { symbol: 'Rp',   decimals: 0, symbolPosition: 'before' },
  KRW: { symbol: '₩',    decimals: 0, symbolPosition: 'before' },
  MYR: { symbol: 'RM',   decimals: 2, symbolPosition: 'before' },
  NZD: { symbol: 'NZ$',  decimals: 2, symbolPosition: 'before' },
  PHP: { symbol: '₱',    decimals: 2, symbolPosition: 'before' },
  TWD: { symbol: 'NT$',  decimals: 0, symbolPosition: 'before' },
  VND: { symbol: '₫',    decimals: 0, symbolPosition: 'after'  },
  BDT: { symbol: '৳',    decimals: 2, symbolPosition: 'before' },
  PKR: { symbol: '₨',    decimals: 2, symbolPosition: 'before' },
  LKR: { symbol: '₨',    decimals: 2, symbolPosition: 'before' },
  NPR: { symbol: '₨',    decimals: 2, symbolPosition: 'before' },
  AED: { symbol: 'د.إ',  decimals: 2, symbolPosition: 'after'  },
  SAR: { symbol: '﷼',    decimals: 2, symbolPosition: 'after'  },
  TRY: { symbol: '₺',    decimals: 2, symbolPosition: 'before' },
  ZAR: { symbol: 'R',    decimals: 2, symbolPosition: 'before' },
  BRL: { symbol: 'R$',   decimals: 2, symbolPosition: 'before' },
  MXN: { symbol: 'MX$',  decimals: 2, symbolPosition: 'before' },
  SEK: { symbol: 'kr',   decimals: 2, symbolPosition: 'after'  },
  NOK: { symbol: 'kr',   decimals: 2, symbolPosition: 'before' },
  DKK: { symbol: 'kr.',  decimals: 2, symbolPosition: 'before' },
  PLN: { symbol: 'zł',   decimals: 2, symbolPosition: 'after'  },
  CZK: { symbol: 'Kč',   decimals: 2, symbolPosition: 'after'  },
  HUF: { symbol: 'Ft',   decimals: 0, symbolPosition: 'after'  },
  RUB: { symbol: '₽',    decimals: 2, symbolPosition: 'after'  },
  UAH: { symbol: '₴',    decimals: 2, symbolPosition: 'before' },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the currency symbol for a given ISO 4217 code.
 * Falls back to the currency code itself if the currency is unknown.
 *
 * @example
 *   getCurrencySymbol('USD')  // '$'
 *   getCurrencySymbol('THB')  // '฿'
 *   getCurrencySymbol('XXX')  // 'XXX'
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_META[currency]?.symbol ?? currency;
}

/**
 * Format an amount with the appropriate currency symbol and decimal places.
 *
 * The symbol is placed before or after the amount according to convention
 * (e.g. "$1,234.56" vs "1,234.56 ₫").
 *
 * Numbers are formatted with thousands separators.
 *
 * @param amount    - The numeric amount (positive; sign should be handled by caller).
 * @param currency  - ISO 4217 currency code (e.g. 'USD').
 *
 * @example
 *   formatCurrency(1234.5,  'USD')  // '$1,234.50'
 *   formatCurrency(1000000, 'VND')  // '1,000,000 ₫'
 *   formatCurrency(1500,    'JPY')  // '¥1,500'
 */
export function formatCurrency(amount: number, currency: string): string {
  const meta = CURRENCY_META[currency];

  if (!meta) {
    // Unknown currency — format with 2 dp and prefix the code
    return `${currency} ${formatNumber(amount, 2)}`;
  }

  const formatted = formatNumber(amount, meta.decimals);

  if (meta.symbolPosition === 'before') {
    return `${meta.symbol}${formatted}`;
  }
  // symbolPosition === 'after': add a thin space between number and symbol
  return `${formatted} ${meta.symbol}`;
}

/**
 * Returns the number of decimal places conventionally used for a currency.
 * Returns 2 for unknown currencies.
 *
 * @example
 *   getCurrencyDecimals('JPY')  // 0
 *   getCurrencyDecimals('USD')  // 2
 */
export function getCurrencyDecimals(currency: string): number {
  return CURRENCY_META[currency]?.decimals ?? 2;
}

/**
 * Returns true if `currency` is in the supported currencies list.
 */
export function isSupportedCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency);
}

/**
 * Parse a formatted currency string back to a number.
 * Strips all non-numeric characters except '.' and '-'.
 *
 * @example
 *   parseCurrencyString('$1,234.56')  // 1234.56
 *   parseCurrencyString('1.234,56')   // 123456  (use with caution for EU formats)
 */
export function parseCurrencyString(value: string): number {
  // Remove everything except digits, decimal points, and leading minus
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Returns a display label for a currency including its symbol.
 * e.g. 'USD ($)' or 'THB (฿)'
 */
export function getCurrencyLabel(currency: string): string {
  const symbol = getCurrencySymbol(currency);
  if (symbol === currency) return currency;
  return `${currency} (${symbol})`;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format a number with thousands separators and a fixed number of decimal places.
 */
function formatNumber(value: number, decimals: number): string {
  // Round to the required decimal places first
  const rounded = parseFloat(value.toFixed(decimals));

  const [intPart, decPart] = rounded.toFixed(decimals).split('.');

  // Insert thousands separators
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return decimals > 0 ? `${intFormatted}.${decPart}` : intFormatted;
}
