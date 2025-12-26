export const DEFAULT_LOCALE = 'es-AR';
export const DEFAULT_CURRENCY = 'ARS';

export function formatCurrency(value: number | undefined): string {
  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY }).format(Number(value || 0));
  } catch {
    return String(value ?? 0);
  }
}

export function formatNumber(value: number | undefined): string {
  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE).format(Number(value || 0));
  } catch {
    return String(value ?? 0);
  }
}
