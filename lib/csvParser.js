import Papa from "papaparse";

/**
 * Creates a stateful header transformer function for PapaParse.
 * - Trims whitespace
 * - Replaces empty headers with fallback column_{index}
 * - Renames duplicates with _{count} suffix
 */
export function createHeaderTransformer() {
  const seen = new Map();
  let index = 0;
  return function transformHeader(header) {
    index++;
    let clean = (header || "").trim();
    if (!clean) {
      clean = `column_${index}`;
    }
    const lower = clean.toLowerCase();
    if (seen.has(lower)) {
      const count = seen.get(lower) + 1;
      seen.set(lower, count);
      return `${clean}_${count}`;
    } else {
      seen.set(lower, 1);
      return clean;
    }
  };
}

/**
 * Normalizes an array of header strings
 */
export function normalizeHeaders(rawHeaders = []) {
  const transform = createHeaderTransformer();
  return rawHeaders.map(transform);
}

/**
 * Parses and validates CSV content from text or file.
 * Handles quoted fields, line breaks, commas, escaped quotes,
 * detects empty files, skips malformed rows, and collects warnings.
 *
 * @param {string} csvText - Raw CSV content string
 * @param {string} fileName - Original filename
 * @returns {Promise<object>} Parsing result
 */
export async function parseAndValidateCSV(csvText, fileName = "dataset.csv") {
  if (!csvText || typeof csvText !== "string" || !csvText.trim()) {
    return {
      success: false,
      error: "The selected CSV file is empty or contains only whitespace.",
      filename: fileName,
      rows: [],
      headers: [],
    };
  }

  return new Promise((resolve) => {
    const headerTransformer = createHeaderTransformer();

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false, // We perform explicit, safe validation in analytics.js
      transformHeader: headerTransformer,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          if (!headers.length) {
            return resolve({
              success: false,
              error: "No header row detected in the CSV file.",
              filename: fileName,
              rows: [],
              headers: [],
            });
          }

          const rawRows = results.data || [];
          const validRows = [];
          const skippedRows = [];
          const warnings = [];

          if (results.errors && results.errors.length > 0) {
            for (const err of results.errors) {
              warnings.push(`Line ${err.row !== undefined ? err.row + 1 : "unknown"}: ${err.message}`);
            }
          }

          // Check if file only had a header and zero data rows
          if (rawRows.length === 0) {
            return resolve({
              success: false,
              error: "The CSV file has headers but contains no data rows.",
              filename: fileName,
              rows: [],
              headers,
            });
          }

          rawRows.forEach((row, idx) => {
            const rowNumber = idx + 2; // 1-indexed, skipping header row
            // Check if row has any non-empty values
            const values = Object.values(row).map((v) => (v !== null && v !== undefined ? String(v).trim() : ""));
            const hasData = values.some((v) => v.length > 0);

            if (!hasData) {
              skippedRows.push({
                rowNumber,
                reason: "Empty row ignored",
              });
              return;
            }

            // Clean string values
            const cleanRow = {};
            headers.forEach((key) => {
              const rawVal = row[key];
              cleanRow[key] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
            });

            validRows.push(cleanRow);
          });

          if (validRows.length === 0) {
            return resolve({
              success: false,
              error: "No valid data rows found in the CSV file.",
              filename: fileName,
              rows: [],
              headers,
              skippedRows,
            });
          }

          resolve({
            success: true,
            filename: fileName,
            headers,
            rows: validRows,
            totalRows: rawRows.length,
            validRowCount: validRows.length,
            skippedRowCount: skippedRows.length,
            skippedRows,
            warnings,
          });
        } catch (err) {
          resolve({
            success: false,
            error: `Parsing exception: ${err.message}`,
            filename: fileName,
            rows: [],
            headers: [],
          });
        }
      },
      error: (err) => {
        resolve({
          success: false,
          error: `CSV parser error: ${err.message}`,
          filename: fileName,
          rows: [],
          headers: [],
        });
      },
    });
  });
}
