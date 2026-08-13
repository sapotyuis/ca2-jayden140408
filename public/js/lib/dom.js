// Provides shared DOM, HTML-safety, event, and number-formatting helpers.
export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const setMarkup = (node, markup) => {
  node.innerHTML = markup;
  return node;
};

const numberFormatter = new Intl.NumberFormat('en-US');
export const formatNumber = (value) => numberFormatter.format(value);

export const on = (node, event, selector, handler) => {
  node.addEventListener(event, (eventObject) => {
    const target = eventObject.target.closest(selector);
    if (target && node.contains(target)) handler(eventObject, target);
  });
};
