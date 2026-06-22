const ActivityLogModel = (() => {

  const COL = {
    CHECK_IN_TIME: 1,
    TICKET: 2,
    SSN: 3,
    FIRST: 4,
    LAST: 5,
    TAX_YEAR: 6,
    COUNSELOR: 7,
    REVIEWER: 8,
    STATUS: 9,
    COMMENTS: 10
  };

function addEntry(entry) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName("Activity_Log");

    const safe = [
      entry.checkInTime || "",
      entry.ticket || "",
      entry.ssnLast4 || "",
      entry.firstName || "",
      entry.lastName || "",
      entry.taxYear || "",
      entry.counselor || "",
      entry.reviewer || "",
      entry.status || "",
      entry.comments || ""
    ];

    sheet.appendRow(safe);
    return true;

  } catch (err) {
    console.error("Model addEntry() error:", err);
    throw new Error("MODEL_ERROR");  // Controller will catch this
  }
}


  return { COL, addEntry };

})();

