/**
 * ====================================================================================
 *  DashboardStressTest.gs
 *  Site Dashboard 10-Day Multi-Day Simulation & Relational Stress Test
 * ====================================================================================
 *
 *  TEST PARAMETERS & SIMULATION CONFIGURATION:
 *  ----------------------------------------------------------------------------------
 *  1. Temporal Window & Session Volume:
 *     - Operational Span : 10 Consecutive Session Days (Day 0 = Today, Days 1-9 = Past).
 *     - Daily Intake     : Randomized between 15 and 35 returns per session.
 *     - Season Target    : 52 Planned Sessions (updated from baseline 120).
 *
 *  2. Time Windows & Duration:
 *     - Arrival Time     : Staggered randomly between 1:00 PM and 5:00 PM.
 *     - Work Duration    : Randomized between 30 and 120 minutes (0:30 to 2:00 h:mm).
 *     - Completion Time  : Calculated as (Arrival Timestamp + Work Duration).
 *
 *  3. Multi-Day Return Lifecycle:
 *     - Same-Day Returns : Initial intake & final status logged on arrival date.
 *     - Multi-Day Returns: 20% of historical returns span across multiple days 
 *                          (intake logged on Day N, completion event logged 2 days later).
 *     - Relational Integrity: Uses UUIDs (TEST_PREFIX + UUID) to tie records 
 *                               between DB_Tax_Returns, DB_History_Log, and active view tabs.
 *
 *  4. Production Rule & Validation Compliance:
 *     - Volunteer Rosters: Dynamically read from production ranges on 'Settings' tab:
 *                          • Counselors : 'Settings'!D2:D
 *                          • Reviewers  : 'Settings'!E2:E
 *     - Distinct Roles   : Ensures Counselor and Reviewer are not the same individual.
 *     - Zero Bypass      : Writes directly against all sheet data validation rules 
 *                          without altering or clearing cell rules.
 *
 *  5. Status Distributions & Routing:
 *     - Today's Queue    : Mix of Checked In, Assigned, In Review, Accepted, Paper, 
 *                          and Incomplete (simulating queue state prior to EOD sweep).
 *     - Historical Days  : Mix of Accepted, Paper, Incomplete, Rejected, Deactivated, 
 *                          and No Return.
 *
 * ====================================================================================
 */

const DashboardStressTest = (() => {

  const TEST_PREFIX = "STRESS_TEST_";

  function getProductionRosters() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName("Settings");

    let counselors = [];
    let reviewers = [];

    if (settingsSheet) {
      counselors = settingsSheet.getRange("D2:D").getValues().flat().filter(v => v && v.toString().trim() !== "");
      reviewers = settingsSheet.getRange("E2:E").getValues().flat().filter(v => v && v.toString().trim() !== "");
    }

    if (counselors.length === 0) counselors = ["VOLUNTEER_A", "VOLUNTEER_B"];
    if (reviewers.length === 0) reviewers = ["REVIEWER_A", "REVIEWER_B"];

    return { counselors, reviewers };
  }

  function getRandomVolunteers(counselors, reviewers) {
    const counselor = counselors[Math.floor(Math.random() * counselors.length)];
    let reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];

    let attempts = 0;
    while (reviewer === counselor && attempts < 10) {
      reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
      attempts++;
    }

    return { counselor, reviewer };
  }

  /**
   * Generates a random arrival timestamp between 1:00 PM and 5:00 PM for a given base date
   */
  function getRandomArrivalTime(baseDate) {
    const arrival = new Date(baseDate.getTime());
    const randomHour = 13 + Math.floor(Math.random() * 4); // 13 (1pm) to 16 (4pm)
    const randomMinute = Math.floor(Math.random() * 60);
    arrival.setHours(randomHour, randomMinute, 0, 0);
    return arrival;
  }

  /**
   * Generates a random duration between 30 and 120 minutes
   */
  function getRandomDurationMinutes() {
    return Math.floor(Math.random() * (120 - 30 + 1)) + 30;
  }

  /**
   * Formats duration into explicit hr/min text string
   */
  function formatDuration(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
  }

  function runFullStressTest() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone();

    clearTestData();

    const { counselors, reviewers } = getProductionRosters();
    const today = new Date();

    console.log("🚀 Starting 10-Day Realistic Multi-Day Operational Simulation...");

    let totalGeneratedReturns = 0;
    let expectedRecentCount = 0;

    // Track status distribution counts for validation
    const expectedCounts = {
      accepted: 0,
      paper: 0,
      incomplete: 0,
      rejected: 0,
      deactivated: 0,
      noReturn: 0,
      inFlight: 0
    };

    // Simulate 10 Days (Day 0 = Today, Days 1-9 = Days in the past)
    for (let dayIndex = 9; dayIndex >= 0; dayIndex--) {
      const sessionDate = new Date(today.getTime() - (dayIndex * 24 * 60 * 60 * 1000));
      const returnsTodayCount = Math.floor(Math.random() * (35 - 15 + 1)) + 15; // 15 to 35
      totalGeneratedReturns += returnsTodayCount;

      if (dayIndex === 0) {
        expectedRecentCount = returnsTodayCount;
      }

      for (let i = 0; i < returnsTodayCount; i++) {
        const arrivalTime = getRandomArrivalTime(sessionDate);
        const durationMin = getRandomDurationMinutes();
        const completionTime = new Date(arrivalTime.getTime() + (durationMin * 60 * 1000));

        // Determine status & lifecycle
        const rand = Math.random();
        let status = "";
        let targetSheet = "";
        let isMultiDay = false;
        let completionDateToUse = completionTime;

        if (dayIndex === 0) {
          // Today's active queue prior to EOD sweep
          if (rand < 0.20) { status = "Checked In"; targetSheet = "Activity_Log"; expectedCounts.inFlight++; }
          else if (rand < 0.40) { status = "Assigned"; targetSheet = "Activity_Log"; expectedCounts.inFlight++; }
          else if (rand < 0.60) { status = "In Review"; targetSheet = "Activity_Log"; expectedCounts.inFlight++; }
          else if (rand < 0.80) { status = "Accepted"; targetSheet = "Archive"; expectedCounts.accepted++; }
          else if (rand < 0.90) { status = "Paper"; targetSheet = "Archive"; expectedCounts.paper++; }
          else { status = "Incomplete"; targetSheet = "Incomplete"; expectedCounts.incomplete++; }
        } else {
          // Historical days: Includes multi-day completions where work finishes 1-2 days later
          if (rand < 0.55) { 
            status = "Accepted"; 
            targetSheet = "Archive"; 
            expectedCounts.accepted++;
            // 20% of historical accepted returns span across multiple days
            if (Math.random() < 0.20) {
              isMultiDay = true;
              // Realistic multi-day: Resumed 2 days later at a new random afternoon time
              const completionDay = new Date(sessionDate.getTime() + (2 * 24 * 60 * 60 * 1000));
              const resumeTime = getRandomArrivalTime(completionDay);
              completionDateToUse = new Date(resumeTime.getTime() + (durationMin * 60 * 1000));
            }
          }
          else if (rand < 0.70) { status = "Paper"; targetSheet = "Archive"; expectedCounts.paper++; }
          else if (rand < 0.85) { status = "Incomplete"; targetSheet = "Incomplete"; expectedCounts.incomplete++; }
          else if (rand < 0.90) { status = "Rejected"; targetSheet = "Incomplete"; expectedCounts.rejected++; }
          else if (rand < 0.95) { status = "Deactivated"; targetSheet = "Archive"; expectedCounts.deactivated++; }
          else { status = "No Return"; targetSheet = "Archive"; expectedCounts.noReturn++; }
        }

        seedSingleReturn({
          arrivalTime,
          completionTime: completionDateToUse,
          durationMin,
          status,
          targetSheetName: targetSheet,
          counselors,
          reviewers,
          isMultiDay
        });
      }
    }

    SpreadsheetApp.flush();
    SiteDashboardController.refreshDashboard();

    // Audit Results
    const rawMetrics = SiteDashboardModel.calculateMetrics();
    const std = rawMetrics.std;
    const stdCompleted = std.efiledAccepted + std.paper;
    const stdIncomplete = std.waitingForCompletion + std.rejected;
    const stdTotalServed = stdCompleted + stdIncomplete + std.deactivated + std.noReturn;

    console.log("=================================================");
    console.log("   10-DAY MULTI-DAY SIMULATION AUDIT REPORT");
    console.log("=================================================");
    console.log(`Total Generated Returns: ${totalGeneratedReturns}`);
    console.log(`STD Total Served Counted: ${stdTotalServed} / ${totalGeneratedReturns}`);
    console.log(`STD Completed: ${stdCompleted} (Expected: ${expectedCounts.accepted + expectedCounts.paper})`);
    console.log(`STD Waiting/Incomplete: ${stdIncomplete} (Expected: ${expectedCounts.incomplete + expectedCounts.rejected + expectedCounts.inFlight})`);
    console.log(`Most Recent Session Returns: ${rawMetrics.recent.efiledAccepted + rawMetrics.recent.paper + rawMetrics.recent.waitingForCompletion + rawMetrics.recent.rejected + rawMetrics.recent.deactivated + rawMetrics.recent.noReturn} (Expected: ${expectedRecentCount})`);
    console.log("=================================================");

    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "10-Day Realistic Simulation Complete",
      `Seeded: ${totalGeneratedReturns} Tax Returns over 10 Session Days\n` +
      `Planned Season Sessions Target: 52 Sessions\n\n` +
      `Total Served Counted: ${stdTotalServed} / ${totalGeneratedReturns}\n` +
      `Most Recent Session Intake: ${expectedRecentCount} Returns\n\n` +
      `Check Logs (Ctrl + Enter) for full audit metrics.`,
      ui.ButtonSet.OK
    );
  }

  /**
   * Helper: Finds true bottom of sheet using a mandatory column (Last Name) to bypass checkboxes
   */
  function appendToTrueBottom(sheet, rowData, mandatoryColIndex) {
    const colData = sheet.getRange(1, mandatoryColIndex, sheet.getMaxRows(), 1).getValues();
    let targetRow = 1;
    for (let i = colData.length - 1; i >= 0; i--) {
      if (colData[i][0] !== "" && colData[i][0] !== null && colData[i][0] !== undefined) {
        targetRow = i + 1;
        break;
      }
    }
    sheet.getRange(targetRow + 1, 1, 1, rowData.length).setValues([rowData]);
  }

  /**
   * Helper: Seeds DB_Tax_Returns, DB_History_Log, and target queue sheet for 1 return
   */
  function seedSingleReturn(config) {
    const { arrivalTime, completionTime, durationMin, status, targetSheetName, counselors, reviewers, isMultiDay } = config;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dbReturnsSheet = ss.getSheetByName("DB_Tax_Returns");
    const dbHistorySheet = ss.getSheetByName("DB_History_Log");
    const viewSheet = ss.getSheetByName(targetSheetName);

    if (!viewSheet) return;

    const tz = ss.getSpreadsheetTimeZone();
    const returnId = TEST_PREFIX + Utilities.getUuid();
    const historyId = Utilities.getUuid();
    const mockSSN = Number(Math.floor(1000 + Math.random() * 9000));
    const ticketNum = Number(Math.floor(10 + Math.random() * 89));

    const { counselor, reviewer } = getRandomVolunteers(counselors, reviewers);
    const arrivalFormatted = Utilities.formatDate(arrivalTime, tz, "MM/dd/yy hh:mm:ss a");
    const completionFormatted = Utilities.formatDate(completionTime, tz, "MM/dd/yy hh:mm:ss a");

    // 1. DB_Tax_Returns Entry
    if (dbReturnsSheet) {
      dbReturnsSheet.appendRow([
        returnId, String(mockSSN), "TEST_FIRST", "TEST_LAST", "", "", 2026, arrivalFormatted, String(ticketNum)
      ]);
    }

    // 2. DB_History_Log Entry (Logs initial intake and multi-day completion event if applicable)
    if (dbHistorySheet) {
      dbHistorySheet.appendRow([historyId, returnId, "Checked In", counselor, arrivalFormatted, "Arrival Intake"]);
      if (isMultiDay) {
        dbHistorySheet.appendRow([Utilities.getUuid(), returnId, status, reviewer, completionFormatted, "Multi-Day Completion"]);
      }
    }

    // 3. Target View Sheet Entry routing via true bottom logic
    if (targetSheetName === "Activity_Log") {
      // Last Name is Col 6 (F)
      appendToTrueBottom(viewSheet, [
        returnId, arrivalTime, ticketNum, String(mockSSN), "TEST_FIRST", "TEST_LAST", 2026, counselor, reviewer, status, "Live Active Queue Item", `${durationMin} min`
      ], 6);
    } 
    else if (targetSheetName === "Incomplete") {
      // Last Name is Col 5 (E)
      appendToTrueBottom(viewSheet, [
        false, arrivalTime, String(mockSSN), "TEST_FIRST", "TEST_LAST", 2026, counselor, reviewer, status, "Paused Return", formatDuration(durationMin)
      ], 5);
    } 
    else if (targetSheetName === "Archive") {
      // Last Name is Col 4 (D)
      appendToTrueBottom(viewSheet, [
        arrivalTime, String(mockSSN), "TEST_FIRST", "TEST_LAST", 2026, counselor, reviewer, status, isMultiDay ? "Multi-Day Completion" : "Same-Day Completion", completionTime, formatDuration(durationMin)
      ], 4);
    }
  }

function clearTestData() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tabsToClean = ["DB_Tax_Returns", "DB_History_Log", "Activity_Log", "Incomplete", "Archive"];

    tabsToClean.forEach(tabName => {
      const sh = ss.getSheetByName(tabName);
      if (sh && sh.getLastRow() > 1) {
        const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
        
        // Loop backwards through the rows
        for (let i = data.length - 1; i >= 0; i--) {
          const rowStr = JSON.stringify(data[i]);
          
          // If the row contains the test ID OR the dummy names, clear its contents
          if (rowStr.includes(TEST_PREFIX) || rowStr.includes("TEST_FIRST") || rowStr.includes("TEST_LAST")) {
            sh.getRange(i + 2, 1, 1, sh.getLastColumn()).clearContent();
          }
        }
      }
    });

    SpreadsheetApp.flush();
    
    // Refresh the dashboard back to 0
    if (typeof SiteDashboardController !== "undefined" && SiteDashboardController.refreshDashboard) {
      SiteDashboardController.refreshDashboard();
    }

    console.log("🧹 Relational test data cleared successfully (rows preserved).");
  }

  return {
    runFullStressTest,
    clearTestData
  };

})();

function RUN_DASHBOARD_STRESS_TEST() {
  DashboardStressTest.runFullStressTest();
}

function CLEAR_DASHBOARD_TEST_DATA() {
  DashboardStressTest.clearTestData();
}