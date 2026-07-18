/**
 * DashboardCompiler.gs
 * Compiles the relational database logs into the active daily Activity_Log view.
 */
const DashboardCompiler = (() => {

  /**
   * Refreshes the daily dashboard by compiling the latest states from the history logs.
   */
  function compileDailyDashboard() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const dbHistorySheet = ss.getSheetByName("DB_History_Log");
      const dbReturnsSheet = ss.getSheetByName("DB_Tax_Returns");
      const activityLogSheet = ss.getSheetByName("Activity_Log");

      // 1. Fetch all raw data from relational backend tables
      const historyData = dbHistorySheet.getDataRange().getValues();
      const returnsData = dbReturnsSheet.getDataRange().getValues();

      if (returnsData.length <= 1) {
        // Database is completely empty, clear dashboard data rows (leave headers)
        clearDashboardRows(activityLogSheet);
        return;
      }

      // 2. Build a map of the latest historical status state for each Tax_Return_ID
      // Columns index mapping for DB_History_Log: 
      // row[1] = Tax_Return_ID, row[2] = Status, row[3] = Volunteer_ID/Assignee, row[4] = Timestamp, row[5] = Comments
      const latestStatusMap = {};
      
      for (let i = 1; i < historyData.length; i++) {
        const row = historyData[i];
        const returnId = row[1];
        if (!returnId) continue;

        const currentTimestamp = new Date(row[4]);

        // Keep the row with the absolute latest timestamp for this return ID
        if (!latestStatusMap[returnId] || currentTimestamp >= latestStatusMap[returnId].timestamp) {
          latestStatusMap[returnId] = {
            status: row[2],
            assignee: row[3],
            timestamp: currentTimestamp,
            comments: row[5]
          };
        }
      }

      // 3. Map Master Profile Data by Return ID for lightning-fast matching
      // Column index mapping for DB_Tax_Returns:
      // row[0] = ID, row[1] = SSN, row[2] = First, row[3] = Last, row[6] = Tax_Year, row[7] = Ticket
      const profileMap = {};
      for (let j = 1; j < returnsData.length; j++) {
        const row = returnsData[j];
        const returnId = row[0];
        if (!returnId) continue;

        profileMap[returnId] = {
          ssnLast4: row[1],
          firstName: row[2],
          lastName: row[3],
          taxYear: row[6],
          ticketNumber: row[7] || ""
        };
      }

      // 4. Filter and assemble active dashboard rows
      const outputRows = [];
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);

      const TERMINAL_STATES = ["Accepted", "Paper", "No Return", "Deactivated"];

      for (const returnId in latestStatusMap) {
        const state = latestStatusMap[returnId];
        const profile = profileMap[returnId];
        
        // Skip orphaned history rows missing master profile records
        if (!profile) continue;

        if (TERMINAL_STATES.includes(state.status)) {
            continue; // Skip rendering completely, no matter when it happened
        }

        // Determine assignment values based on operational workflows
        // (e.g., if status is In Review, the assignee in history is the Reviewer)
        let counselor = "";
        let reviewer = "";
        if (state.status === "Assigned") counselor = state.assignee;
        if (state.status === "In Review") reviewer = state.assignee;

        // Construct the row array to perfectly align with ActivityLogModel indices:
        // Col A: Return ID, Col B: Check-In Time, Col C: Ticket #, Col D: SSN Last 4, 
        // Col E: First Name, Col F: Last Name, Col G: Tax Year, Col H: Counselor, 
        // Col I: Reviewer, Col J: Status, Col K: Comments, Col L: [Duration formula]
        const rowData = [
          returnId,                         // Column A
          state.timestamp,                  // Column B
          profile.ticketNumber,             // Column C
          profile.ssnLast4,                 // Column D
          profile.firstName,                // Column E
          profile.lastName,                 // Column F
          profile.taxYear,                  // Column G
          counselor,                        // Column H
          reviewer,                         // Column I
          state.status,                     // Column J
          state.comments,                   // Column K
          ""                                // Column L (Leave empty string so local formula column remains intact)
        ];

        outputRows.push(rowData);
      }

      // 5. Commit compiled data to the active user dashboard sheet in one single operation
      clearDashboardRows(activityLogSheet);
      
      if (outputRows.length > 0) {
        activityLogSheet.getRange(2, 1, outputRows.length, 12).setValues(outputRows);
      }

      Logger.log(`Successfully compiled active dashboard: ${outputRows.length} returns rendered.`);

    } catch (err) {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        "❌ Error in DashboardCompiler.compileDailyDashboard",
        `Details: ${err.message}\n\nStack Trace:\n${err.stack}`,
        ui.ButtonSet.OK
      );
    }
  }

  /**
   * Helper function to safely clear out old display values without removing layout structure
   */
  function clearDashboardRows(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 12).clearContent();
    }
  }

  return {
    compileDailyDashboard
  };

})();