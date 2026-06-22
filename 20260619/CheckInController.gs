function checkIn(data) {
  if (!data) throw new Error("No check‑in data received.");

  const pad = (v, w) => v.toString().padStart(w, "0");
  const digits = v => (v || "").toString().replace(/\D/g, "");
  const cap = v => (v || "").toString().trim().toUpperCase();

  let ticket = digits(data.ticketNumber);
  if (ticket) ticket = pad(ticket, 2);

  let ssn = digits(data.ssnLast4);
  if (ssn) ssn = pad(ssn, 4);

  let first = cap(data.firstName);
  let last  = cap(data.lastName);
  let comments = cap(data.comments);

  // -----------------------------------------
  // Allowed years from Settings sheet
  // -----------------------------------------
  const allowedYears = SettingsModel.getAllowedYears();
  let taxYear = digits(data.taxYear);

  // Default year from settings
  if (!taxYear) taxYear = SettingsModel.getDefaultYear();

  // Enforce allowed years
  if (!allowedYears.includes(taxYear)) {
    throw new Error(
      "Tax Year must be one of: " + allowedYears.join(", ")
    );
  }
  taxYear = taxYear.padStart(4, "0");

  // -----------------------------------------
  // Format check‑in time (h:mmAM)
  // -----------------------------------------
  const now = new Date();
  const hours = now.getHours();
  const mins = pad(now.getMinutes(), 2);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  const checkInTime = `${h12}:${mins}${ampm}`;

  // -----------------------------------------
  // Build entry
  // -----------------------------------------
  const entry = {
    checkInTime,
    ticket,
    ssnLast4: ssn,
    firstName: first,
    lastName: last,
    taxYear,
    counselor: "",
    reviewer: "",
    status: "Checked In",
    comments
  };

  ActivityLogModel.addEntry(entry);

  return { ok: true };
}
