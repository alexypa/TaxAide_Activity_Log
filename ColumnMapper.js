/**
 * ColumnMapper.gs
 * Maps column header names to column numbers for ANY sheet.
 */

const ColumnMapper = (() => {

  // Cache maps per sheet name
  const cache = {};

  /**
   * Load header map for a given sheet.
   * Returns: { HEADERNAME: columnNumber, ... }
   */
  function load(sheetName) {
    if (cache[sheetName]) return cache[sheetName];

    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet not found: " + sheetName);

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    const map = {};
    headers.forEach((name, index) => {
      const key = name.toString().trim().toUpperCase();
      if (key !== "") {
        map[key] = index + 1; // convert 0-based → 1-based
      }
    });

    cache[sheetName] = map;
    return map;
  }

  /**
   * Get column number for a given header in a given sheet.
   */
  function col(sheetName, headerName) {
    const map = load(sheetName);
    const key = headerName.toString().trim().toUpperCase();
    if (!(key in map)) {
      throw new Error(`Column '${headerName}' not found in sheet '${sheetName}'.`);
    }
    return map[key];
  }

  /**
   * Expose full map for debugging or iteration.
   */
  function map(sheetName) {
    return load(sheetName);
  }

  return { 
    load, 
    col, 
    map 
  };

})();