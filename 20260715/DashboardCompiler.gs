/**
 * DashboardCompiler.gs
 * Compiles the relational database logs into the active daily Activity_Log view.
 */
const DashboardCompiler = (() => {

  function compileDailyDashboard() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const dbHistorySheet = ss.getSheetByName("DB_History_Log");
      const dbReturnsSheet = ss.getSheetByName("DB_Tax_Returns");
      const activityLogSheet = ss.getSheetByName("Activity_Log");

      const historyData = dbHistorySheet.getDataRange().getValues();
      const returnsData = dbReturnsSheet.getDataRange().getValues();

      // CRITICAL FIX 1: WIPE CONTENT AND BACKGROUND COLORS ACROSS THE WHOLE GRID BEFORE REBUILDING
      const currentLastRow = activityLogSheet.getLastRow();
      if (currentLastRow > 1) {
        const clearRange = activityLogSheet.getRange(2, 1, currentLastRow - 1, activityLogSheet.getLastColumn());
        clearRange.clearContent();
        clearRange.setBackground("#ffffff"); // Reset all cell backgrounds back to clean white
      }

      if (returnsData.length <= 1) return;

      // Build status tracking state map
      const latestStatusMap = {};
      for (let i = 1; i < historyData.length; i++) {
        const row = historyData[i];
        const returnId = row[1];
        if (!returnId) continue;

        const currentTimestamp = new Date(row[4]);
        if (!latestStatusMap[returnId] || currentTimestamp >= latestStatusMap[returnId].timestamp) {
          latestStatusMap[returnId] = {
            status: row[2],
            assignee: row[3],
            timestamp: currentTimestamp,
            comments: row[5]
          };
        }
      }

      // Map profiles out of DB_Tax_Returns safely
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
          ticketNumber: row[7]
        };
      }

      const outputRows = [];
      const COL = ActivityLogModel.getColumns();
      const numColumns = activityLogSheet.getLastColumn() || 12;

      for (const returnId in latestStatusMap) {
        const state = latestStatusMap[returnId];
        const profile = profileMap[returnId];
        
        if (!profile) continue;

        // Queue burndown filter: drop terminal actions immediately
        if (["Accepted", "Paper", "No Return", "Deactivated"].includes(state.status)) {
          continue; 
        }

        let counselor = "";
        let reviewer = "";
        if (state.status === "Assigned") counselor = state.assignee;
        if (state.status === "In Review") reviewer = state.assignee;

        const rowData = new Array(numColumns).fill("");

        // CRITICAL FIX 2: STRICT TOKENS FOR CLEAN COLUMNS
        let cleanTicket = (profile.ticketNumber || "").toString().trim();
        
        // Safety Guard: If the ticket data contains a timestamp string structure instead of a simple integer/code, force clear it for appointments
        if (cleanTicket.includes(":") || cleanTicket.includes("/") || Date.parse(cleanTicket) > 0) {
          cleanTicket = ""; 
        }

        rowData[COL.RETURN_ID - 1]    = returnId;
        rowData[COL.CHECKIN_TIME - 1] = state.timestamp;
        rowData[COL.TICKET - 1]       = cleanTicket; // Safely separated from arrival time
        rowData[COL.SSN_LAST4 - 1]    = (profile.ssnLast4 || "").toString().trim();
        rowData[COL.FIRST - 1]        = profile.firstName;
        rowData[COL.LAST - 1]         = profile.lastName;
        rowData[COL.TAXYEAR - 1]      = profile.taxYear;
        rowData[COL.COUNSELOR - 1]    = counselor;
        rowData[COL.REVIEWER - 1]     = reviewer;
        rowData[COL.STATUS - 1]       = state.status;
        rowData[COL.COMMENTS - 1]     = state.comments || "";

        outputRows.push(rowData);
      }
      
      if (outputRows.length > 0) {
        activityLogSheet.getRange(2, 1, outputRows.length, numColumns).setValues(outputRows);
      }

      Logger.log(`Compiled: ${outputRows.length} returns rendered.`);
    } catch (err) {
      Logger.log(`Error compiler: ${err.stack}`);
    }
  }

  return {
    compileDailyDashboard
  };
})();