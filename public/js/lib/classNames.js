// Generates consistent CSS class names from a component-specific prefix.
export const createClassNames = (prefix) => new Proxy({}, {
  get: (_target, property) => `${prefix}-${String(property)}`,
});
