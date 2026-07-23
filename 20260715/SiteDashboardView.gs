/**
 * ====================================================================================
 *  SiteDashboardView.gs
 *  Visual renderer for the Site Dashboard tab.
 * ====================================================================================
 */

const SiteDashboardView = (() => {

  const SHEET_NAME = "Dashboard";

  function renderDashboard(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME, 0);
    }

    sheet.clear();
    sheet.setHiddenGridlines(false); // FIXED: Show gridlines on this sheet

    const timeZone = ss.getSpreadsheetTimeZone();
    const updatedTag = Utilities.formatDate(new Date(), timeZone, "MM/dd/yyyy hh:mm a");

    // Grid Construction
    const grid = [
      [`AARP TAXAIDE SITE DASHBOARD`, "", `Last Updated: ${updatedTag}`],
      ["METRIC", "TAX SEASON TO DATE", `MOST RECENT SESSION (${data.mostRecentDateLabel})`],
      ["Completed Tax Returns", data.std.completedTotal, data.recent.completedTotal],
      ["   • e-Filed & Accepted", data.std.efiledAccepted, data.recent.efiledAccepted],
      ["   • Paper Returns", data.std.paper, data.recent.paper],
      ["Incomplete Tax Returns", data.std.incompleteTotal, data.recent.incompleteTotal],
      ["   • Waiting for Completion", data.std.waitingForCompletion, data.recent.waitingForCompletion],
      ["   • Rejected by IRS", data.std.rejected, data.recent.rejected],
      ["Deactivated Returns", data.std.deactivated, data.recent.deactivated],
      ["No Return Started", data.std.noReturn, data.recent.noReturn],
      ["TOTAL TAXPAYERS SERVED", data.std.totalServed, data.recent.totalServed],
      ["# of Sessions in Season to Date", data.std.sessionsCount, data.recent.sessionsCount],
      ["Total # of Sessions This Season", data.totalPlannedSessions, data.totalPlannedSessions],
      ["Percent of Season Completed", data.percentCompleted, "-"],
      ["# of Active Counselors & Reviewers", data.std.volunteersCount, data.recent.volunteersCount]
    ];

    // Write batch grid
    sheet.getRange(1, 1, grid.length, 3).setValues(grid);

    // Styling & Formatting
    sheet.getRange("A1:C1").merge().setBackground("#1c4587").setFontColor("#ffffff").setFontWeight("bold").setFontSize(12);
    sheet.getRange("A2:C2").setBackground("#434343").setFontColor("#ffffff").setFontWeight("bold");

    // Section Headers Formatting
    const boldRows = [3, 6, 9, 10, 11, 12, 13, 14, 15];
    boldRows.forEach(r => sheet.getRange(r, 1, 1, 3).setFontWeight("bold"));

    // Total Row Highlight
    sheet.getRange(11, 1, 1, 3).setBackground("#d9ead3").setFontSize(11);

    // Column Alignment & Widths
    sheet.getRange("A1:A15").setHorizontalAlignment("left");
    sheet.getRange("B1:C15").setHorizontalAlignment("center");
    sheet.setColumnWidth(1, 340);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 240);

    // Focus Dashboard
    ss.setActiveSheet(sheet);
  }

  return {
    renderDashboard
  };

})();