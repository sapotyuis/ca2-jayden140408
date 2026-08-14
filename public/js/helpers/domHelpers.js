// Provides shared HTML-safety and number-formatting helpers.
export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const numberFormatter = new Intl.NumberFormat('en-US');
export const formatNumber = (value) => numberFormatter.format(value);
