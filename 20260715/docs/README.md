# AARP Tax-Aide Activity Logging and Tax Return Tracking System

A multi-site, district wide activity logging and tax return tracking system designed as a multi-disciplinary tool for AARP Tax-Aide volunteers engaged in providing tax preparation services. The system is built on Google Workplace Apps Script (GAS) to enable check-ins of taxpayers, status tracking of their tax returns, archiving, and management oversight during the entire Tax-Aide season.

---

## Project Overview: Hub-and-Spoke Model

The platform utilizes a Hub-and-Spoke topology designed to isolate production environments while retaining alignment between the hub and the spokes:

* **The Spoke Sites:** Multiple independent physical deployment instances at tax preparation sites. Each instance contains an identical, isolated codebase bound to that location's operational spreadsheet. Each instance is used by Tax-Aide volunteers of all roles at the site, including greeters, tax counselors, quality reviewers and site leadership. Each instance may be configured independently to account for differences in operational procedures (e.g. sites that operate by appointment and sites that operate on a first-come/first served basis).
* **The Hub Project:** A centralized repository of site and volunteer data, including site configurations, volunteer associations with sites, volunteer roles, certifications and contact information. The hub project is primarily used by district personnel, including the district, administration, training and technology coordinators. The hub remains decoupled from the physical daily operation of the sites, except for receiving and compiling real-time performance data.

---

## Project User Profiles and Responsibilities

The system's user interface is designed for the real-time, shared environment populated by the primary volunteer cohorts at the AARP Tax-Aide districts and sites:

* **Greeters:** Stationed at the entry point of the site. Greeters (also known as Support and/or Client Facilitators) perform taxpayer intakes by checking in daily taxpayer appointments or manually adding walk-ins into the Tax-Aide Activity Logging and Tax Return Tracking System. Their primary responsibilities include executing check-ins, assigning counselors and/or reviewers to taxpayers.
* **Counselors and Reviewers (Tax Preparers):** Assigned to specific taxpayers, they prepare the taxpayer's tax returns. Their responsibilities include logging milestones their activities into the Tax-Aide Activity Logging and Tax Return Tracking System (e.g "Ready for Review" for counselors or "e-Filed" for reviewers) including exceptions to the process, such as incompletion due to various reasons. The system also timestamps the various session times to enable computing wait and process metrics.
* **Site Coordinators:** Supervise total site operations, managing flow bottlenecks, serve as escalation authorities, deal with exceptions, and triggering the end-of-day sequence to purge active queues and archive data.
* **Session Management Coordinators:** Manage the daily appointments originated by the AARP's online Session Management system and transferring the daily appointment data to the AARP Tax-Aide Activity Logging and Tax Return Tracking System.
* **District Leadership and Administrators** Manage and use the centralized repository of site and volunteer data, including site configurations, volunteer associations with sites, volunteer roles, certifications and contact information. These hub activities are decoupled from the physical daily operation of the sites, except for receiving and compiling real-time performance data.

---

## System Architecture & Google Sheets Integration

The application implements a decoupled Model-View-Controller (MVC) architectural design pattern optimized for Google Apps Script's event-driven runtime:

**[ User / Sheet Edit Event ] -> [ Controller ] -> [ Model ] -> [ View ]**

* **Model (*Model.gs):** Represents the data layer. Interacts directly with the underlying sheets. To circumvent the high performance costs of repeated Google Apps Script API calls, the models pull ranges into RAM arrays, execute queries/filters locally in memory, and prepare objects for state updates.
* **View (*View.gs):** Manages all structural modifications back to the User Interface. To prevent visual lagging or UI desynchronization for system  users, views employ batch-writing operations to force synchronous rendering.
* **Controller (*Controller.gs):** Serves as the operational "brain". Bound directly to the Main.gs trigger layer. It catches the edit event's structural payload, extracts critical execution parameters, evaluates validation rules, and dispatches instructions between models and views.

---

## Development, Deployment, & Version Control Environment

The project implements a local development environment that links local source files to Google's cloud Apps Script containers:

### Core Tools
* **Clasp (Google Apps Script CLI):** Manages code transport between the local workspace and Google Servers.
* **Git / GitHub:** Tracks source control history, isolates feature branches, and manages the cloud backup history repository.
* **Visual Studio Code** VS Code is the primary code and documentation (ReadMe and User Manual) editor. Scripts are pushed from local storage to the Google Cloud using clasp push. VS Code is integrated with git for source control

### The Workspace Topology
Edits are authored locally or inside the Test Site cloud workspace container. The root folder represents the master source of truth.

* Folder Layout:
  - **.git/ :** Local Git repository tracking master workspace and versions.
  - **hub-project/ :** Isolated backup folder of shared Hub code
  - **dist/ :** Excluded staging directory generated dynamically during deployment
  - **.clasp.json :** Local configuration mapping clasp to the Test Site
  - **.gitignore :** Configured to drop dist/ out of version control tracking
  - **appsscript.json :** Script manifest definition
  - **deploy.ps1 :** The multi-site automated deployment script from the test to the sites' production environment
  - **Source scripts:** Master script files (stored as local .js or .gs and .html modules)

### The Deployment Loop
1. Developer pushes code updates from VS Code to the Google Cloud using clasp push.
2. Code is tested on a cloud-based test spreadsheet.
3. Developer backs up the workspace baseline up to git: git push origin main
4. Developer triggers production rollouts: ./deploy.ps1

How deploy.ps1 works: The automated script clears and opens an isolated dist/ directory, mirrors the active *.js and *.html files into it, and boots a loop across every production script container. It updates .clasp.json on the fly inside the loop to run forced clasp push -f actions, before resetting the terminal anchor safely back to the Test Site ID.

---

## Coding Style & Architectural Directives

To preserve readability across multiple developer hand-offs, the codebase enforces the following programmatic rules:

* **Modular Encapsulation:** All architectural files (except Main.js) must be wrapped inside Immediately Invoked Function Expressions (IIFE) namespaces to prevent global scope pollution.
* **Classes** Tax Return, TaxReturnHistory and Volunteer are core classes. CRUD operations are executed by a DatabaseController IIFE module to and from mirrored spreadsheet tabs.
* **Zero Raw API Network Reads on Events:** Controllers handling spreadsheet editing actions must check the literal values associated with the editing event (e.value) rather than invoking get() methods, thereby avoiding client/server round trips. This prevents thread blocking during busy sign-in hours.
* **Explicit File Formatting:** Files are stored locally with .js extensions for compatibility with IDE syntax highlighters (like Visual Studio Code) and automatically parsed to .gs format upon server upload via clasp.

---

## Active Script Manifest File Directory

Here is the operational log mapping out your primary active development assets:

### System Core & Orchestration
* **Main.js:** The entry checkpoint framework for the system. Houses the global onEdit(e) listener, capturing sheet events and routing them to the appropriate subsystem controller based on sheet names. The module also handles the custom Tax-Aide menu items, including the routing of user-initiated items to the appropriate function in another module (e.g. End of Day processing).
* **Settings.js:** The centralized configuration repository. Contains static configurations used across all modules.
* **ColumnMapper.js:** Maps the column headers of any sheet to a column number.

### Appointment Management Subsystem (Intake)
* This subsystem is only used at sites that operates by appointment. These modules will be hidden for sites that operate on a first-come/first served basis. 
* **AppointmentController.js**: Listens for user's activity on the Appointments sheet. Called by Main onEdit event handler when an edit occurs on the Appointments sheet. Handles pasting of appointments from Session Management and the transfer of appointments to the Activity Log upon taxpayer check in.
* **AppointmentModel.js:** Queries, reads, and processes local database rows representing appointments at the current operational shift.
* **AppointmentView.js:** Handles real-time cell alterations on the appointment sheet.

### Logs, Archival, & Processing Subsystem
* **ActivityLogController.js:** Serves as the onEdit event handler for the Activity_log sheet. Routes the event to various functions, depending on the field of the sheet being edited. 
* **StateController.js:** The "brain" of the system's state machine. Determines the actions the ActivityLogView module must perform, given the current state of a tax return activity log and based on permitted and forbidden state transitions (e.g. from "Assigned" to "Ready for Review"), terminal states (e.g. "Accepted" return), transitions that require the operator to state a reason for a transition (e.g. stating a reason for an IRS rejection of a tax return). The state controller also examines all attempted transitions and prevents those that are not permitted as per Tax-Aide's standard operating procedures (e.g. not allowing a counselor and reviewer of the tax return to be the same person).
* **ReasonDialogController.js:** Handles the user dialog for any state transition that requires an explanation for the reason for the transition (e.g. the incompletion of a tax return). This module works in conjunction with the ReasonDialog.html form which presents the user with options for responses to the reason query and enables the user to submit their response. The options presented to the user are contained in the TransitionReasonRegistry.js module.
* **ActivityLogModel.js:** Queries, reads, and processes local database rows representing active tax returns processed at the current operational shift.
* **ActivityLogView.js:** Handles real-time cell alterations on the Activity Log sheet.
* **IncompleteController.js:** Controls the transition of Incomplete tax returns back to the Activity Log, whenever a taxpayer returns to the site to complete their tax return at a later date.
* **IncompleteModel.js:** Queries, reads, and processes local database rows representing incomplete tax returns processed at prior operational shifts.
* **IncompleteView.js:** Handles real-time cell alterations on the Incomplete sheet.
* **End of Day Process:** Upon completion of the day's session, the Shift Coordinator initiates the End of Day Process from the system's Tax-Aide menu (see **Main.js**) This process includes:  
  * Archival of completed tax return- IRS-accepted, Paper filed, deactivated returns and taxpayer interactions that did not result in tax return  preparation.
  * Transferring unfinished tax returns to Incomplete sheet for future  handling
  * Clearing of Activity Log sheet for the next day's session



## 📄 License

This project is maintained for personal and volunteer use. See `LICENSE` for details if applicable.

---

*Maintained by [@alexypa](https://github.com/alexypa)*