const DEFAULT_FROM = "#7c5cff";
const DEFAULT_TO = "#ff9a5c";
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Escapa los caracteres con significado en XML (texto y atributos). */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]!);
}

/** Sólo colores hex: cualquier otro valor (p. ej. con comillas o url()) usa el predeterminado. */
function safeColor(value: string, fallback: string) {
  return HEX_COLOR.test(value) ? value : fallback;
}

/** Avatar SVG generado (iniciales + degradado) como data URI: sin imágenes externas. */
export function avatarDataUri(name: string, from = DEFAULT_FROM, to = DEFAULT_TO): string {
  const initials = escapeXml(
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      // Array.from respeta pares sustitutos (emoji) al tomar la primera letra.
      .map((p) => Array.from(p)[0]!.toUpperCase())
      .join(""),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${safeColor(from, DEFAULT_FROM)}"/><stop offset="1" stop-color="${safeColor(to, DEFAULT_TO)}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="21" font-weight="600" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
