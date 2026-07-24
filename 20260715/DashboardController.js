/**
 * ====================================================================================
 *  DashboardController.gs
 *  Central controller managing relational data lookups, dashboard updates, 
 *  and terminal data archiving.
 * ====================================================================================
 */
const DashboardController = (() => {

  const TERMINAL = ["Accepted", "Paper", "No Return", "Deactivated"];

  function isStatusTerminal(status) {
    if (!status) return false;
    const cleanStatus = status.toString().trim().toLowerCase();
    return TERMINAL.some(t => t.toLowerCase() === cleanStatus);
  }

  /**
   * Refreshes and compiles the active dashboard grid scratchpad.
   * Pulls ONLY today's non-terminal returns from the master data logs,
   * while hydrating historical durations for paused/terminal states.
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
        
        // Find Created Date regardless of potential column shifting
        let createdDateRaw = retRow[7];
        if (!createdDateRaw || isNaN(new Date(createdDateRaw).getTime())) {
          createdDateRaw = retRow[6]; // Fallback if shifted
        }
        if (!createdDateRaw || isNaN(new Date(createdDateRaw).getTime())) {
          createdDateRaw = now; // Safety fallback
        }

        const recordDateString = Utilities.formatDate(new Date(createdDateRaw), ss.getSpreadsheetTimeZone(), "yy/MM/dd");
        
        // Match only the current day's operational shift
        if (recordDateString === todayString) {
          
          let latestStatus = "";
          let counselorName = "";
          let reviewerName = "";
          let latestComments = "";
          let statusCaptured = false;

          // Added: Track timestamps for state hydration
          let firstCheckInTime = null;
          let terminalEventTime = null;

          // 4. Trace the complete history backwards to isolate distinct workflow assignments
          for (let j = historyData.length - 1; j >= 0; j--) {
            const histRow = historyData[j];
            if (histRow[1] === returnId) {
              let currentStatus = histRow[2] ? histRow[2].toString().trim() : "";
              const assignedVolunteer = histRow[3] || "";
              const eventTimestamp = new Date(histRow[4]); // Col 5 in DB is Timestamp

              // Map legacy EOD string to valid dropdown option
              if (currentStatus === "EOD_INCOMPLETE") {
                currentStatus = "Incomplete";
              }

              // ABSOLUTE LATEST STATE: Captures the genuine current status of the return
              if (!statusCaptured && currentStatus) {
                latestStatus = currentStatus;
                statusCaptured = true;
                
                // If the absolute latest state is a terminal state, mark when it happened
                if (isStatusTerminal(currentStatus) || currentStatus === "Incomplete" || currentStatus === "e-Filed") {
                  terminalEventTime = eventTimestamp;
                }
              }

              if (!latestComments && histRow[5]) {
                latestComments = histRow[5];
              }

              // LATEST ASSIGNMENTS
              if (currentStatus.toLowerCase().includes("review") && !reviewerName) {
                reviewerName = assignedVolunteer;
              }
              if (currentStatus === "Assigned" && !counselorName) {
                counselorName = assignedVolunteer;
              }
              
              // Capture the very first "Checked In" timestamp (earliest historical record)
              if (currentStatus === "Checked In") {
                firstCheckInTime = eventTimestamp;
              }
            }
          }

          // Fallback if history had no status entry
          if (!latestStatus) {
            latestStatus = "Checked In";
          }
          
          // Calculate State Hydration (Frozen Duration)
          let hydratedDuration = "";
          if (firstCheckInTime && terminalEventTime && firstCheckInTime < terminalEventTime) {
            const elapsedMinutes = Math.floor((terminalEventTime.getTime() - firstCheckInTime.getTime()) / 60000);
            hydratedDuration = `${elapsedMinutes} min`;
          }

          // Bypass terminal rows completely (e.g. "No Return", "Accepted", "Paper", "Deactivated")
          if (isStatusTerminal(latestStatus)) continue;

          dailyRows.push([
            returnId,                                 // Col A: Return ID
            new Date(createdDateRaw),                 // Col B: Check In Time
            retRow[8] || "",                          // Col C: Ticket #
            retRow[1] ? retRow[1].toString() : "",    // Col D: SSN Last 4
            retRow[2] ? retRow[2].toUpperCase() : "", // Col E: First Name
            retRow[3] ? retRow[3].toUpperCase() : "", // Col F: Last Name
            retRow[6] || "",                          // Col G: Tax Year
            counselorName,                            // Col H: Counselor
            reviewerName,                             // Col I: Reviewer
            latestStatus,                             // Col J: Status (Guaranteed valid)
            latestComments,                           // Col K: Comments
            hydratedDuration                          // Col L: Duration (Hydrated from History!)
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
      let finalStatus = "";
      let latestComments = "";
      let statusCaptured = false;

      // Multi-row backwards trace ensures split data lines aren't dropped
      for (let j = historyData.length - 1; j >= 0; j--) {
        const histRow = historyData[j];
        if (histRow[1] === targetReturnId) {
          const currentStatus = histRow[2] ? histRow[2].toString().trim() : "";
          const assignedVolunteer = histRow[3] || "";

          if (!statusCaptured && currentStatus) {
            finalStatus = currentStatus;
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

      if (!finalStatus) finalStatus = "Accepted";

      const archiveRow = [
        targetReturnId,
        staticRecord[7],                                         // Created_Date
        staticRecord[8] || "",                                   // Ticket #
        staticRecord[1] ? staticRecord[1].toString() : "",       // SSN Last 4
        staticRecord[2] ? staticRecord[2].toUpperCase() : "",    // First Name
        staticRecord[3] ? staticRecord[3].toUpperCase() : "",    // Last Name
        staticRecord[6] || "",                                   // Tax Year
        counselorName || "UNASSIGNED",    
        reviewerName || "UNASSIGNED",     
        finalStatus,                                             // Exact final status
        latestComments || "",
        new Date()                                               // Archive Date Stamp
      ];

      // Sort with most recent completion stacked on top
      archiveSheet.insertRowBefore(2);
      archiveSheet.getRange(2, 1, 1, 12).setValues([archiveRow]);

    } catch (err) {
      Logger.log(`Archiving execution pipeline broken: ${err.message}`);
    }
  }

  return {
    refreshDailyDashboard,
    handleRecordArchiving,
    isStatusTerminal
  };

})();