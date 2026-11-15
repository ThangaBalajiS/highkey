// For text from other users that ends up in an HTML template
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}
