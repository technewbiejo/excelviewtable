export type CsvRow = { [key: string]: string };

export function parseCsv(csvString: string): { headers: string[]; data: CsvRow[] } {
  const rows = csvString.trim().split(/\r?\n/);
  if (rows.length === 0) {
    return { headers: [], data: [] };
  }

  // Simple regex to handle commas within quotes
  const headerRow = rows.shift()!;
  const headers = (headerRow.match(/(".*?"|[^",\r]+)(?=\s*,|\s*$)/g) || []).map(h => h.replace(/^"|"$/g, '').trim());

  const data: CsvRow[] = rows.map(rowStr => {
    // Return empty object if row is empty
    if (!rowStr.trim()) return {};

    const values = (rowStr.match(/(".*?"|[^",\r]+)(?=\s*,|\s*$)/g) || []).map(v => v.replace(/^"|"$/g, '').trim());
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  }).filter(row => Object.keys(row).length > 0);

  return { headers, data };
}
