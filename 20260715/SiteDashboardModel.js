/**
 * ============================================================
 *  SiteDashboardModel.gs
 * ============================================================
 */

const SiteDashboardModel = (() => {

  // Updated to 52 planned sessions for the season
  const TOTAL_PLANNED_SESSIONS = 52;

  function calculateMetrics() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone();

    const activitySheet   = ss.getSheetByName("Activity_Log");
    const incompleteSheet = ss.getSheetByName("Incomplete");
    const archiveSheet    = ss.getSheetByName("Archive");

    const activityData = (activitySheet && activitySheet.getLastRow() > 1) 
      ? activitySheet.getRange(2, 1, activitySheet.getLastRow() - 1, 12).getValues() : [];

    const incompleteData = (incompleteSheet && incompleteSheet.getLastRow() > 1) 
      ? incompleteSheet.getRange(2, 1, incompleteSheet.getLastRow() - 1, 11).getValues() : [];

    const archiveData = (archiveSheet && archiveSheet.getLastRow() > 1) 
      ? archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, 11).getValues() : [];

    const todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    let mostRecentDateStr = todayStr;

    // Determine the most recent active session date from data
    const allDates = [];
    [...activityData, ...archiveData].forEach(r => {
      const d = r[1] instanceof Date ? r[1] : (r[0] instanceof Date ? r[0] : null);
      if (d) allDates.push(Utilities.formatDate(d, tz, "yyyy-MM-dd"));
    });
    
    if (allDates.length > 0) {
      allDates.sort();
      mostRecentDateStr = allDates[allDates.length - 1];
    }

    const metrics = {
      mostRecentDateLabel: Utilities.formatDate(new Date(mostRecentDateStr.replace(/-/g, '/')), tz, "MM/dd/yyyy"),
      std: createBlankMetricSet(),
      recent: createBlankMetricSet(),
      totalPlannedSessions: TOTAL_PLANNED_SESSIONS
    };

    const stdSessionDates = new Set();
    const recentVolunteers = new Set();
    const stdVolunteers = new Set();

    function normalizeRowDate(rawDate) {
      if (rawDate instanceof Date) {
        return Utilities.formatDate(rawDate, tz, "yyyy-MM-dd");
      } else if (rawDate && rawDate.toString().trim() !== "") {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          return Utilities.formatDate(parsed, tz, "yyyy-MM-dd");
        }
      }
      return todayStr;
    }

    function categorize(rowDate, status, counselor, reviewer) {
      const isRecent = (rowDate === mostRecentDateStr);
      if (rowDate) stdSessionDates.add(rowDate);

      if (counselor && counselor.toString().trim() !== "") {
        stdVolunteers.add(counselor.toString().trim().toUpperCase());
        if (isRecent) recentVolunteers.add(counselor.toString().trim().toUpperCase());
      }
      if (reviewer && reviewer.toString().trim() !== "") {
        stdVolunteers.add(reviewer.toString().trim().toUpperCase());
        if (isRecent) recentVolunteers.add(reviewer.toString().trim().toUpperCase());
      }

      const normalizedStatus = status ? status.toString().trim() : "";

      if (normalizedStatus === "Accepted") {
        metrics.std.efiledAccepted++;
        if (isRecent) metrics.recent.efiledAccepted++;
      } 
      else if (normalizedStatus === "Paper") {
        metrics.std.paper++;
        if (isRecent) metrics.recent.paper++;
      } 
      else if (normalizedStatus === "Deactivated") {
        metrics.std.deactivated++;
        if (isRecent) metrics.recent.deactivated++;
      } 
      else if (normalizedStatus === "No Return") {
        metrics.std.noReturn++;
        if (isRecent) metrics.recent.noReturn++;
      } 
      else if (normalizedStatus === "Rejected") {
        metrics.std.rejected++;
        if (isRecent) metrics.recent.rejected++;
      } 
      else {
        metrics.std.waitingForCompletion++;
        if (isRecent) metrics.recent.waitingForCompletion++;
      }
    }

    // Process Activity_Log
    activityData.forEach(r => {
      const returnId = r[0] ? r[0].toString().trim() : "";
      const status = r[9] ? r[9].toString().trim() : "";
      if (!returnId && !status) return;
      categorize(normalizeRowDate(r[1]), status, r[7], r[8]);
    });

    // Process Incomplete
    incompleteData.forEach(r => {
      const ssn = r[2] ? r[2].toString().trim() : "";
      const status = r[8] ? r[8].toString().trim() : "";
      if (!ssn && !status) return;
      categorize(normalizeRowDate(r[1]), status, r[6], r[7]);
    });

    // Process Archive
    archiveData.forEach(r => {
      const ssn = r[1] ? r[1].toString().trim() : "";
      const status = r[7] ? r[7].toString().trim() : "";
      if (!ssn && !status) return;
      categorize(normalizeRowDate(r[0]), status, r[5], r[6]);
    });

    metrics.std.uniqueSessions = stdSessionDates.size || 1;
    metrics.recent.uniqueSessions = 1;

    metrics.std.activeVolunteers = stdVolunteers.size;
    metrics.recent.activeVolunteers = recentVolunteers.size;

    return metrics;
  }

  function createBlankMetricSet() {
    return {
      efiledAccepted: 0,
      paper: 0,
      waitingForCompletion: 0,
      rejected: 0,
      deactivated: 0,
      noReturn: 0,
      uniqueSessions: 0,
      activeVolunteers: 0
    };
  }

  return { calculateMetrics };

})();