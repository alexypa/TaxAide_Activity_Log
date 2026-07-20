/**
 * ====================================================================================
 *  DashboardController.gs
 *  Central controller managing relational data lookups, dashboard updates, 
 *  and terminal data archiving.
 * ====================================================================================
 */
const DashboardController = (() => {

  /**
   * Refreshes and compiles the active dashboard grid scratchpad.
   * Pulls ONLY today's non-terminal returns from the master data logs.
   */
  function refreshDailyDashboard() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName("Activity_Log");
      const dbReturnsSheet = ss.getSheetByName("DB_Tax_Returns");
      const dbHistorySheet = ss.getSheetByName("DB_History_Log");

      if (!logSheet || !dbReturnsSheet || !dbHistorySheet) {
        throw new Error("Required database or log sheets are missing.");
      }

      // 1. Clear the daily workspace grid surface (headers stay on Row 1)
      const lastRowLog = logSheet.getLastRow();
      if (lastRowLog > 1) {
        logSheet.deleteRows(2, lastRowLog - 1);
      }

      // 2. Fetch data populations from master sheets
      const lastRowReturns = dbReturnsSheet.getLastRow();
      const lastRowHistory = dbHistorySheet.getLastRow();
      if (lastRowReturns <= 1) return; 

      const returnsData = dbReturnsSheet.getRange(2, 1, lastRowReturns - 1, 9).getValues();
      const historyData = lastRowHistory > 1 ? dbHistorySheet.getRange(2, 1, lastRowHistory - 1, 6).getValues() : [];

      const now = new Date();
      const todayString = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "yy/MM/dd");
      
      let dailyRows = [];

      // 3. Process records through single-day calendar filters
      for (let i = 0; i < returnsData.length; i++) {
        const retRow = returnsData[i];
        const returnId = retRow[0];       
        const createdDateRaw = retRow[7];  

        if (!createdDateRaw) continue;

        const recordDateString = Utilities.formatDate(new Date(createdDateRaw), ss.getSpreadsheetTimeZone(), "yy/MM/dd");
        
        // Match only the current day's operational shift
        if (recordDateString === todayString) {
          
          let latestStatus = "";
          let counselorName = "";
          let reviewerName = "";
          let latestComments = "";
          let statusCaptured = false;

          // 4. Trace the complete history backwards to isolate distinct workflow assignments
          for (let j = historyData.length - 1; j >= 0; j--) {
            const histRow = historyData[j];
            if (histRow[1] === returnId) {
              const currentStatus = histRow[2];
              const assignedVolunteer = histRow[3];

              // ABSOLUTE LATEST STATE: Captures the genuine current status of the return
              if (!statusCaptured) {
                latestStatus = currentStatus || "Checked In";
                statusCaptured = true;
              }

              if (!latestComments && histRow[5]) {
                latestComments = histRow[5];
              }

              // LATEST ASSIGNMENTS: Captures the most recent staff member assigned to these roles
              if (currentStatus.toLowerCase().includes("review") && !reviewerName) {
                reviewerName = assignedVolunteer;
              }
              if (currentStatus === "Assigned" && !counselorName) {
                counselorName = assignedVolunteer;
              }
            }
          }

          // Bypass terminal rows completely
          if (isStatusTerminal(latestStatus)) continue;

          dailyRows.push([
            returnId,
            new Date(createdDateRaw),         
            retRow[8] || "",                  // Ticket #
            retRow[1] ? retRow[1].toString() : "", 
            retRow[2] ? retRow[2].toUpperCase() : "", // First Name
            retRow[3] ? retRow[3].toUpperCase() : "", // Last Name
            retRow[6] || "",                  // Tax Year
            counselorName,
            reviewerName,
            latestStatus,
            latestComments,
            "" // Duration placeholder
          ]);
        }
      }

      // 5. Output values out to live view scratchpad surface
      if (dailyRows.length > 0) {
        logSheet.getRange(2, 1, dailyRows.length, 12).setValues(dailyRows);
      }

    } catch (err) {
      Logger.log(`Dashboard Refreshes Aborted: ${err.message}`);
    }
  }

  /**
   * Action endpoint loop that formats and packages terminal records for archiving
   * at the top of the Archive ledger tab layout.
   */
  function handleRecordArchiving(targetReturnId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const dbReturnsSheet = ss.getSheetByName("DB_Tax_Returns");
      const dbHistorySheet = ss.getSheetByName("DB_History_Log");
      const archiveSheet = ss.getSheetByName("Archive");

      if (!dbReturnsSheet || !dbHistorySheet || !archiveSheet) {
        throw new Error("Required structural tracking sheets are missing.");
      }

      const lastRowReturns = dbReturnsSheet.getLastRow();
      if (lastRowReturns <= 1) return;
      const returnsData = dbReturnsSheet.getRange(2, 1, lastRowReturns - 1, 9).getValues();
      
      let staticRecord = null;
      for (let i = 0; i < returnsData.length; i++) {
        if (returnsData[i][0] === targetReturnId) {
          staticRecord = returnsData[i];
          break;
        }
      }
      if (!staticRecord) return;

      const lastRowHistory = dbHistorySheet.getLastRow();
      const historyData = lastRowHistory > 1 ? dbHistorySheet.getRange(2, 1, lastRowHistory - 1, 6).getValues() : [];

      let counselorName = "";
      let reviewerName = "";
      let finalStatus = "Accepted";
      let latestComments = "";
      let statusCaptured = false;

      // Multi-row backwards trace ensures split data lines aren't dropped
      for (let j = historyData.length - 1; j >= 0; j--) {
        const histRow = historyData[j];
        if (histRow[1] === targetReturnId) {
          const currentStatus = histRow[2];
          const assignedVolunteer = histRow[3];

          if (!statusCaptured) {
            if (currentStatus.toLowerCase().includes("review") || currentStatus === "Accepted" || currentStatus === "e-Filed" || currentStatus === "Completed") {
              finalStatus = currentStatus;
            }
            statusCaptured = true;
          }

          if (!latestComments && histRow[5]) {
            latestComments = histRow[5];
          }

          if (currentStatus.toLowerCase().includes("review") && !reviewerName) {
            reviewerName = assignedVolunteer;
          }
          if (currentStatus === "Assigned" && !counselorName) {
            counselorName = assignedVolunteer;
          }
        }
      }

      const archiveRow = [
        targetReturnId,
        staticRecord[7],                  // Created_Date
        staticRecord[8] || "",            // Ticket #
        staticRecord[1] ? staticRecord[1].toString() : "", 
        staticRecord[2] ? staticRecord[2].toUpperCase() : "", 
        staticRecord[3] ? staticRecord[3].toUpperCase() : "", 
        staticRecord[6] || "",            
        counselorName || "UNASSIGNED",    
        reviewerName || "UNASSIGNED",     
        finalStatus,                      
        latestComments || "",
        new Date()                        // Archive Date Stamp
      ];

      // Sort with most recent completion stacked on top
      archiveSheet.insertRowBefore(2);
      archiveSheet.getRange(2, 1, 1, 12).setValues([archiveRow]);

    } catch (err) {
      Logger.log(`Archiving execution pipeline broken: ${err.message}`);
    }
  }

  function isStatusTerminal(status) {
    if (!status) return false;
    const cleanStatus = status.toString().trim();
    return ["Completed", "E-Filed", "Accepted", "Rejected", "EOD_INCOMPLETE"].includes(cleanStatus);
  }

  return {
    refreshDailyDashboard,
    handleRecordArchiving
  };

})();