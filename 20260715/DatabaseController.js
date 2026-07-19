/**
 * DatabaseController handles CRUD operations for the relational DB tabs.
 */
const DatabaseController = {

  /**
   * Appends a new data row to a target sheet using an explicit row range array
   * @param {Sheet} sheet - Target Google Sheet object
   * @param {Array} rowArray - Flat array of values to write
   */
  appendRowExplicit: function(sheet, rowArray) {
    const values = sheet.getRange("A:A").getValues();
    let nextRow = 2; // Default to row 2 if sheet is empty below headers
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString().trim() === "") {
        nextRow = i + 1;
        break;
      }
    }
    sheet.getRange(nextRow, 1, 1, rowArray.length).setValues([rowArray]);
    return nextRow;
  },

/**
   * Finds an existing tax return file by Name/SSN AND Tax Year combo
   * @param {Sheet} sheet - The DB_Tax_Returns sheet
   * @param {string} fName - First name
   * @param {string} lName - Last name
   * @param {string} ssnLast4 - Last 4 of SSN
   * @param {string} taxYear - The specific filing year (e.g., "2025")
   * @return {string|null} The existing TaxReturn ID or null
   */
  findExistingTaxpayerId: function(sheet, fName, lName, ssnLast4, taxYear) {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return null; // Only header exists
    
    // Defensive normalization against null/undefined inputs
    const safeFName = fName ? String(fName) : "";
    const safeLName = lName ? String(lName) : "";
    const safeSSN   = ssnLast4 ? String(ssnLast4) : "";
    const safeYear  = taxYear ? String(taxYear) : "";

    const searchFName = safeFName.toUpperCase().trim();
    const searchLName = safeLName.toUpperCase().trim();
    const searchSSN   = safeSSN.trim();
    const searchYear  = safeYear.trim();

    // Loop through rows (skip header row 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Column index mapping: 
      // row[2] = First Name, row[3] = Last Name, row[1] = SSN, row[6] = Tax Year
      if ((row[2] || "").toString().trim() === searchFName && 
          (row[3] || "").toString().trim() === searchLName && 
          (row[1] || "").toString().trim() === searchSSN &&
          (row[6] || "").toString().trim() === searchYear) {
        return row[0]; // Return the existing unique return ID
      }
    }
    return null;
  },

  /**
   * Checking in a taxpayer
   * @param {Spreadsheet} ss - Active Spreadsheet object
   * @param {Object} apptEntry - Entry payload from your Appointment sheet
   * @return {string} The TaxReturn ID used or generated
   */
  processCheckInTransaction: function(ss, apptEntry) {
    const dbReturnsSheet = ss.getSheetByName("DB_Tax_Returns");
    const dbHistorySheet = ss.getSheetByName("DB_History_Log");

    const fName = apptEntry.firstName;
    const lName = apptEntry.lastName;
    const ssn = apptEntry.ssnLast4 || "";
    const taxYear = apptEntry.taxYear || "";

    // 1. Transaction Step 1: Check for an existing master profile
    let taxReturnId = this.findExistingTaxpayerId(dbReturnsSheet, fName, lName, ssn);
    
    if (!taxReturnId) {
      // Brand new taxpayer profile needed
      const newReturn = new TaxReturn(null, ssn, fName, lName, apptEntry.firstNameSpouse, apptEntry.lastNameSpouse, taxYear);
      taxReturnId = newReturn.id;
      this.appendRowExplicit(dbReturnsSheet, newReturn.toRowArray());
      Logger.log(`Created new master profile for ${lName} with ID: ${taxReturnId}`);
    } else {
      Logger.log(`Found existing profile for ${lName}. Reusing ID: ${taxReturnId}`);
    }

    // 2. Transaction Step 2: Log the initial "Checked In" lifecycle event
    // Note: Checking in happens at front intake, so volunteerId is blank ("") initially
    const initialEvent = new TaxReturnHistory(taxReturnId, "Checked In", "", "");
    this.appendRowExplicit(dbHistorySheet, initialEvent.toRowArray());
    Logger.log(`Logged 'Checked In' event for transaction identifier: ${taxReturnId}`);

    return taxReturnId;
  }
};