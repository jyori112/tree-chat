/**
 * Generate a UUID with fallback for environments where crypto.randomUUID is not available
 */
export function generateUUID(): string {
  // Try crypto.randomUUID first (available in secure contexts)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID failed, falling back to manual generation:', error);
    }
  }

  // Fallback: Manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}