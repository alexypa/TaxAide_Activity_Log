/**
 * ============================================================
 *  IncompleteController.gs
 *  Handles edits to the Incomplete sheet
 * ============================================================
 */

const IncompleteController = (() => {
  
  function handleIncompleteEdit(e) {

    const sheetName = e.range.getSheet().getName();
    if (sheetName !== "Incomplete") return { ok: true, ignore: true };

    const col = e.range.getColumn();
    const row = e.range.getRow();
    const newValue = e.range.getValue();

    // Programmatic Guardrail: If anyone attempts to edit cell A1, immediately force-reset it
    if (col === 1 && row === 1) {
      e.range.getSheet().getRange("A1").setValue("Transfer to Activity Log");
      return { ok: true, ignore: true };
    }

    // Ignore edits in any column other that column A (Transfer to Activity Log) and in header row
    if (col !== 1 || row === 1) return { ok: true, ignore: true };

    // Ignore unchecking
    if (newValue !== true) return { ok: true, ignore: true };

    // Read row data
    const taxReturn = IncompleteModel.getIncompleteRow(row);

    return {
      ok: true,
      ignore: false,
      action: "CREATE_ACTIVITY_LOG_ENTRY",
      taxReturn,
      row
    };
  }

  return {
    handleIncompleteEdit
  }
})();