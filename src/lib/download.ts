export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCSV<T extends Record<string, unknown>>(rows: T[], headers?: (keyof T)[]) {
  if (!rows.length) return "";
  const cols = (headers ?? (Object.keys(rows[0]) as (keyof T)[])).filter(Boolean);
  const headerLine = cols.map((c) => escapeCsvCell(String(c))).join(",");
  const lines = rows.map((r) => cols.map((c) => escapeCsvCell(r[c])).join(","));
  return [headerLine, ...lines].join("\n");
}
