# TaxAide Activity Log

A Google Apps Script application for tracking and managing volunteer activity logs for AARP TaxAide programs. Built with a **Model-View-Controller (MVC)** architecture and an optional diagnostics mode for development and troubleshooting.

---

## 📋 Project Overview

TaxAide Activity Log automates the recording, validation, and reporting of volunteer activity data within Google Sheets. It is designed for greeters, counselors, coordinators and district administrators to streamline data entry, enforce consistency, and generate organized session records with minimal manual effort.

---

## ✨ Features

- **Structured Activity Logging** — Captures volunteer sessions, roles, and hours with validated input fields
- **MVC Architecture** — Clean separation of data (Model), UI (View), and business logic (Controller) for maintainability
- **Diagnostics Mode** — Built-in diagnostics layer for runtime inspection, error tracing, and debug output during development
- **Google Sheets Integration** — Operates natively within Google Sheets
- **Input Validation** — Enforces data integrity rules on submission to prevent malformed log entries
- **Automated Summaries** — Generates activity summaries and rollup reports on demand
- **Version-Controlled Source** — Managed with `clasp` for full Git-based change history

---

## 🏗️ Architecture Summary

The project follows an **MVC pattern** implemented in Google Apps Script:

```
TaxAide_Activity_Log/
├── Main.gs              # Entry point — menu registration and top-level triggers
├── Controller.gs        # Business logic — handles user actions and coordinates Model/View
├── Model.gs             # Data layer — reads/writes to Google Sheets, data validation
├── View.gs              # UI layer — renders sidebar HTML, dialogs, and Sheet formatting
├── Diagnostics.gs       # Diagnostics module — logging, debug flags, runtime tracing
├── appsscript.json      # Apps Script manifest (scopes, runtime, timezone)
└── .clasp.json          # clasp configuration (scriptId, rootDir)
```

| Layer | File | Responsibility |
|---|---|---|
| **Model** | `Model.gs` | Sheet data access, record CRUD, validation rules |
| **View** | `View.gs` | Sheet output formatting |
| **Controller** | `Controller.gs` | User action handlers, orchestrates Model ↔ View |
| **Diagnostics** | `Diagnostics.gs` | Debug logging, error surfacing, environment flags |

### Diagnostics Mode

Diagnostics can be toggled via a flag in `Diagnostics.gs`. When enabled, runtime events, validation failures, and execution traces are written to a dedicated log sheet or the Apps Script logger, making it easy to debug without modifying core logic.

---

## ⚙️ Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- A Google account with access to the target Google Sheet
- `clasp` installed globally:

```bash
npm install -g @google/clasp
```

### 1. Clone the Repository

```bash
git clone https://github.com/alexypa/TaxAide_Activity_Log.git
cd TaxAide_Activity_Log
```

### 2. Authenticate clasp

```bash
clasp login
```

This opens a browser window for Google OAuth authorization.

### 3. Link to Your Apps Script Project

If you are connecting to an **existing** Apps Script project, update `.clasp.json` with your script ID:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./src"
}
```

> Find your Script ID in the Apps Script editor under **Project Settings → IDs**.

To create a **new** bound script linked to a Google Sheet:

```bash
clasp create --type sheets --title "TaxAide Activity Log"
```

### 4. Push Code to Apps Script

```bash
clasp push
```

### 5. Open and Authorize in the Editor

```bash
clasp open
```

Run any function once from the Apps Script editor to trigger the OAuth permission prompts for Sheets access.

---

## 🔄 Version Control Workflow

This project uses **`clasp` + Git** for a full version control workflow.

### Typical Development Cycle

```bash
# 1. Pull latest remote script state (optional, for team sync)
clasp pull

# 2. Make changes locally in your editor

# 3. Push changes to Apps Script
clasp push

# 4. Test in Google Sheets via the custom menu

# 5. Commit and push to GitHub
git add .
git commit -m "feat: describe your change clearly"
git push origin main
```

### Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `dev` | Active development and feature work |
| `fix/*` | Targeted bug fixes |
| `feature/*` | New feature development |

### Commit Message Conventions

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add session rollup summary generation
fix: correct hour validation for multi-session entries
chore: update clasp config for new script binding
docs: update README setup instructions
```

### Snapshot Folders

Local dated snapshots (e.g., `20260622/`) serve as manual backups and reference points. These are preserved in OneDrive but are **not** the canonical source of truth — Git history is.

---

## 🤝 Contribution Notes

Contributions, corrections, and improvements are welcome.

1. **Fork** the repository and create a feature branch from `dev`
2. Follow the MVC layer boundaries — keep data logic in `Model.gs`, UI in `View.gs`, and orchestration in `Controller.gs`
3. Use `Diagnostics.gs` logging calls for any new debug output; do **not** use `console.log` or `Logger.log` directly in core files
4. Test changes in a personal copy of the Google Sheet before submitting a pull request
5. Submit a **Pull Request** to the `dev` branch with a clear description of the change and any testing steps

### Code Style Guidelines

- Use `camelCase` for variables and functions
- Add JSDoc comments to all public functions
- Keep functions focused — single responsibility per function
- Disable diagnostics mode (`DIAGNOSTICS_ENABLED = false`) before merging to `main`

---

## 📁 Local Development Path

Synced via OneDrive:

```
C:\Users\aparn\OneDrive\Documents\TaxAide_Activity_Log\
```

Dated snapshot folders (e.g., `20260622\`) contain point-in-time copies for reference.

---

## 📄 License

This project is maintained for personal and volunteer use. See `LICENSE` for details if applicable.

---

*Maintained by [@alexypa](https://github.com/alexypa)*
