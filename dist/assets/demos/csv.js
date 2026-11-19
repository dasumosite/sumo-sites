export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === "," || char === "\n" || char === "\r")) {
      row.push(value);
      value = "";
      if (char !== ",") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === "\r" && text[i + 1] === "\n") i += 1;
      }
    } else {
      value += char;
    }
  }

  if (quoted) throw new Error("Unclosed CSV quote");
  if (row.length || value) rows.push([...row, value]);
  const headers = (rows.shift() || []).map((header) => header.trim());
  return { headers, rows: rows.map((cells) => Object.fromEntries(headers.map((key, index) => [key, (cells[index] || "").trim()]))) };
}

async function getRows(url, columns) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Could not load spreadsheet");
  const { headers, rows } = parseCsv(await response.text());
  if (!columns.every((key) => headers.includes(key))) throw new Error("Missing required columns");
  return rows;
}

export async function loadSheet(publishedUrl, sampleUrl, columns) {
  if (publishedUrl) {
    try {
      return { rows: await getRows(publishedUrl, columns), connected: true };
    } catch {
      return { rows: await getRows(sampleUrl, columns), connected: false, fallback: true };
    }
  }
  return { rows: await getRows(sampleUrl, columns), connected: false };
}
