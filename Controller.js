/**
 * SIMPLE onOpen() — menu only.
 * Installable trigger will open the sidebar.
 */
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("TaxAide Activity Log")
    .addItem("Check In New Taxpayer", "showCheckInSidebar")
    .addToUi();
}

/**
 * Opens the HTML sidebar.
 * This MUST be called by an INSTALLABLE trigger.
 */
function showCheckInSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("CheckInSidebar.html")
    .setTitle("Check In Taxpayer")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);  // prevents caching
  SpreadsheetApp.getUi().showSidebar(html);
}


/**
 * VALIDATION + NORMALIZATION
 * Returns:
 *   { ok: true, data: {...normalized fields...} }
 *   { ok: false, message: "Error message" }
 */
function validateCheckIn(data) {
  const isAppointment = data.isAppointment === true;

  // -----------------------------
  // Normalize raw inputs
  // -----------------------------
  let ticket = (data.ticketNumber || "").toString();
  let ssn = (data.ssnLast4 || "").toString();
  let first = (data.firstName || "").toString().trim();
  let last = (data.lastName || "").toString().trim();
  let taxYear = (data.taxYear || "").toString().trim();
  let comments = (data.comments || "").toString().trim();

  // -----------------------------
  // Required for ALL check-ins
  // -----------------------------
  if (!first) return { ok: false, message: "Enter the taxpayer's first name" };
  if (!last)  return { ok: false, message: "Enter the taxpayer's last name" };

  // -----------------------------
  // Tax Year: DEFAULT FIRST
  // -----------------------------
  if (taxYear === "") {
    taxYear = "2026";
  }

  // -----------------------------
  // Walk-in ONLY validation
  // -----------------------------
  if (!isAppointment) {

    // Ticket: strip all non-digits
    ticket = ticket.replace(/\D/g, "");
    if (!ticket || Number(ticket) < 1 || Number(ticket) > 99) {
      return { ok: false, message: "Ticket number must be 1–99" };
    }

    // SSN: strip all non-digits
    ssn = ssn.replace(/\D/g, "");
    if (!/^\d{4}$/.test(ssn)) {
      return { ok: false, message: "Enter the last 4 digits of the taxpayer's SSN" };
    }

    // Tax Year must be valid
    if (!/^(2023|2024|2025|2026)$/.test(taxYear)) {
      return { ok: false, message: "Tax Year must be 2023–2026" };
    }
  }

  // -----------------------------
  // SUCCESS — return normalized data
  // -----------------------------
  return {
    ok: true,
    data: {
      isAppointment,
      ticket,
      ssn,
      first: first.toUpperCase(),
      last: last.toUpperCase(),
      taxYear,
      comments: comments.toUpperCase()
    }
  };
}

/**
 * MAIN CHECK-IN ENTRY POINT
 * Returns clean error messages to HTML (no system popups)
 */
function checkIn(data) {
  const result = validateCheckIn(data);

  if (!result.ok) {
    // Return clean message to HTML success handler
    return { ok: false, message: result.message };
  }

  const v = result.data;

  const entry = {
    checkInTime: new Date(),
    ticket: v.ticket,
    ssnLast4: v.ssn,
    firstName: v.first,
    lastName: v.last,
    taxYear: v.taxYear,
    counselor: "",
    reviewer: "",
    status: "Checked In",
    comments: v.comments
  };

  ActivityLogModel.addEntry(entry);

  return { ok: true };
}

/**
 * APPOINTMENT CHECK-IN TRIGGER
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    if (sheet.getName() !== "Appointments") return;

    const range = e.range;
    if (range.getColumn() !== 1) return;
    if (e.value !== "TRUE") return;

    const row = range.getRow();
    const processedCell = sheet.getRange(row, 6);

    // Prevent double check-ins
    if (processedCell.getValue() === "Checked IN") return;

    // Read appointment row (A–E)
    const rowValues = sheet.getRange(row, 1, 1, 5).getValues()[0];
    const firstName = rowValues[2];
    const lastName = rowValues[3];

    if (!firstName || !lastName) return;

    // Perform appointment check-in
    const result = checkIn({
      isAppointment: true,
      ticketNumber: "",
      ssnLast4: "",
      firstName,
      lastName,
      taxYear: "",
      comments: "Appointment Check-In"
    });

    // If validation fails (rare for appointments), do not mark processed
    if (!result.ok) {
      console.log("Appointment check-in failed:", result.message);
      return;
    }

    processedCell.setValue("Checked IN");

  } catch (err) {
    console.error("Error in onEdit for Appointments:", err);
  }
}
