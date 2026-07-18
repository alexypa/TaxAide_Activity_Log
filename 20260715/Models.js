/**
 * Core Relational Data Models for AARP TaxAide Dashboard System
 */

class TaxReturn {
  /**
   * @param {string} id - Unique identifier (UUID). If empty, one will be generated.
   * @param {string} ssnLast4 - Last 4 digits of SSN
   * @param {string} fNamePrimary - Primary Taxpayer First Name
   * @param {string} lNamePrimary - Primary Taxpayer Last Name
   * @param {string} fNameSpouse - Spouse First Name (optional)
   * @param {string} lNameSpouse - Spouse Last Name (optional)
   * @param {string} taxYear - e.g., "2025"
   */
  constructor(id, ssnLast4, fNamePrimary, lNamePrimary, fNameSpouse, lNameSpouse, taxYear) {
    this.id = id || Utilities.getUuid(); 
    this.ssnLast4 = ssnLast4 || "";
    this.firstNamePrimary = fNamePrimary ? fNamePrimary.toUpperCase() : "";
    this.lastNamePrimary = lNamePrimary ? lNamePrimary.toUpperCase() : "";
    this.firstNameSpouse = fNameSpouse ? fNameSpouse.toUpperCase() : "";
    this.lastNameSpouse = lNameSpouse ? lNameSpouse.toUpperCase() : "";
    this.taxYear = taxYear || "";
    this.createdDate = new Date();
  }

  /** Maps object properties to a flat row array for the 'Tax_Returns' master sheet */
  toRowArray() {
    return [
      this.id,
      this.ssnLast4,
      this.firstNamePrimary,
      this.lastNamePrimary,
      this.firstNameSpouse,
      this.lastNameSpouse,
      this.taxYear,
      this.createdDate
    ];
  }
}

class TaxReturnHistory {
  /**
   * @param {string} taxReturnId - Foreign Key matching TaxReturn.id
   * @param {string} status - Current lifecycle status text
   * @param {string} volunteerId - Foreign Key matching Volunteer.id
   * @param {string} comments - Operational notes or tracking details
   */
  constructor(taxReturnId, status, volunteerId, comments) {
    this.historyId = Utilities.getUuid();
    this.taxReturnId = taxReturnId;
    this.status = status;
    this.volunteerId = volunteerId || "";
    this.comments = comments || "";
    this.timestamp = new Date();
  }

  /** Maps object properties to a flat row array for the hidden 'Tax_Return_History' audit log */
  toRowArray() {
    return [
      this.historyId,
      this.taxReturnId,
      this.status,
      this.volunteerId,
      this.timestamp,
      this.comments
    ];
  }
}

class Volunteer {
  /**
   * @param {string} id - Short code or numeric ID (e.g., "V01")
   * @param {string} fullName - Full name of the volunteer
   * @param {string} role - Counselor, Reviewer, Facilitator
   */
  constructor(id, fullName, role) {
    this.id = id;
    this.fullName = fullName;
    this.role = role;
  }

  /** Maps object properties to a flat row array for the 'Volunteers' roster sheet */
  toRowArray() {
    return [
      this.id,
      this.fullName,
      this.role
    ];
  }
}