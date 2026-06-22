/**
 * Controller.gs
 * Thin onEdit router using ColumnMapper + StateModel + StateController
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Add menu
  ui.createMenu("Check In")
    .addItem("Open Check-In Sidebar", "showCheckInSidebar")
    .addToUi();

    // Apply dynamic validation on open
    applyDynamicValidation_();
}

function showCheckInSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("CheckInSidebar")
    .setTitle("Check In");
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Main onEdit router
 */
function onEdit(e) {
  try {
    if (!e || !e.range || !e.source) return;

    const sheet = e.source.getActiveSheet();
    if (sheet.getName() !== "Activity_Log") return;

    const row = e.range.getRow();
    const col = e.range.getColumn();
    if (row < 2) return; // ignore header row

    const model = StateModel.loadRow(row);

    // Determine which column was edited
    const COL = {
      TICKET:     ColumnMapper.col("Activity_Log", "TICKET #"),
      SSN:        ColumnMapper.col("Activity_Log", "SSN LAST 4"),
      FIRST:      ColumnMapper.col("Activity_Log", "FIRST NAME"),
      LAST:       ColumnMapper.col("Activity_Log", "LAST NAME"),
      TAXYEAR:    ColumnMapper.col("Activity_Log", "TAX YEAR"),
      COUNSELOR:  ColumnMapper.col("Activity_Log", "COUNSELOR"),
      REVIEWER:   ColumnMapper.col("Activity_Log", "REVIEWER"),
      STATUS:     ColumnMapper.col("Activity_Log", "STATUS"),
      COMMENTS:   ColumnMapper.col("Activity_Log", "COMMENTS")
    };

    let result = null;

    // Route to correct handler
    if (col === COL.COUNSELOR) {
      result = StateController.handleCounselorEdit(model, e);
    }
    else if (col === COL.REVIEWER) {
      result = StateController.handleReviewerEdit(model, e);
    }
    else if (col === COL.STATUS) {
      result = StateController.handleStatusEdit(model, e);
    }
    else {
      return; // other columns not controlled by state machine
    }

    // Apply result
    StateController.applyResult(result, model, row, e);

  } catch (err) {
    SpreadsheetApp.getUi().alert("Error in onEdit: " + err);
  }
}

/**
 * Apply dynamic data validation for Tax Year column based on SettingsModel.
 */
function applyDynamicValidation_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Activity_Log");
  if (!sheet) return;

  const allowedYears = SettingsModel.getAllowedYears();
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedYears, true)
    .setAllowInvalid(false)
    .build();

  // Identify the Tax Year column
  const col = ColumnMapper.col("Activity_Log", "TAX YEAR");

  // Apply validation from row 2 downward (row 1 is header)
  const lastRow = sheet.getMaxRows();
  const range = sheet.getRange(2, col, lastRow - 1, 1);
  range.setDataValidation(rule);
}

