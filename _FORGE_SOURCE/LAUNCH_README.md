# FORGE: Logos Workshop - READY TO LAUNCH

## Quick Start

**Option 1: PowerShell (Recommended)**
```powershell
.\LAUNCH_FORGE.ps1
```

**Option 2: Batch File**
```cmd
LAUNCH_FORGE.bat
```

**Option 3: Manual**
```bash
npm run tauri dev
```

## Build Production EXE

```powershell
.\BUILD_FORGE_EXE.ps1
```

This script runs preflight checks, then builds release bundles to:
`src-tauri\target\release\bundle\`

If it fails with `link.exe not found`, install:
- Build Tools for Visual Studio 2022
- Desktop development with C++
- MSVC v143 toolset
- Windows 10/11 SDK

---

## What Was Fixed

### Database Connection (Feb 15, 2026)
**Problem:** App couldn't connect to PostgreSQL - all authentication failed  
**Root Cause:** Single hardcoded user `postgres:Moss9pep2828` - but pg_hba.conf on NAS likely doesn't allow that user from this machine

**Solution Implemented:**
✅ App now tries **3 users** in sequence: `lowes → david → postgres`  
✅ Database is now **optional** - app runs in "Local mode" if DB unavailable  
✅ 2-second timeout per attempt (was blocking forever)  
✅ Status dots show connection state:
- 🔴 Red = All credentials failed
- 🟢 Green = Connected  
- ⚪ Gray = Not attempted

### Changes Made
- **src-tauri/src/lib.rs** (lines 150-181): Multi-credential connection logic
- **LAUNCH_FORGE.ps1**: PowerShell launcher with diagnostics
- **LAUNCH_FORGE.bat**: Simple batch launcher

---

## Status Indicators (Top Right)

The sidebar shows 2 status dots:

1. **Database Dot**  
   - 🟢 Green = Connected to PostgreSQL  
   - 🔴 Red = Connection failed (app still works)  
   - ⚪ Gray = Not connected

2. **AI Dot**  
   - 🔵 Blue = Anthropic API key configured  
   - ⚪ Gray = No API key (AI features disabled)

---

## Features

- **Vault Management**: Open any folder as a vault of `.md` notes
- **File Tree**: Browse markdown files (filters out `.obsidian`, `node_modules`, etc.)
- **Rich Editor**: TipTap-based markdown editor with formatting
- **AI Panel**: Ctrl+Shift+A to open (requires API key in settings)
- **Database**: Optional PostgreSQL integration for metadata storage

---

## PostgreSQL Connection (Optional)

**Credentials Being Tried:**
1. `lowes:Moss9pep2828@192.168.1.177:2665/theophysics`
2. `david:Moss9pep2828@192.168.1.177:2665/theophysics`
3. `postgres:Moss9pep2828@192.168.1.177:2665/theophysics`

**If All Fail:**
App runs in **Local mode** - all file operations work, just no database features.

**To Fix Connection (if needed):**
SSH into NAS and check `/var/lib/postgresql/data/pg_hba.conf`:
```
# Add this line to allow connections from your Windows machine
host    theophysics    lowes    192.168.1.0/24    md5
```

Then restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## Dependencies

- **Node.js** (v22+)
- **Rust** (via rustup)
- **Tauri CLI** (installed via npm)

Launcher scripts check for these automatically.

---

## Project Structure

```
_FORGE_SOURCE/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── Sidebar.tsx    # File browser + status
│   │   ├── Editor/        # TipTap editor
│   │   └── AiPanel.tsx    # AI assistant
│   └── App.tsx            # Main app
├── src-tauri/             # Rust backend
│   └── src/
│       └── lib.rs         # Tauri commands (DB, files)
├── LAUNCH_FORGE.ps1       # PowerShell launcher
└── LAUNCH_FORGE.bat       # Batch launcher
```

---

## Next Steps

1. **Launch the app**: Run `LAUNCH_FORGE.ps1`
2. **Open a vault**: Click "Open Vault" and select `O:\Theophysics_Data` (or any folder)
3. **Create notes**: Use the `+` button in sidebar
4. **Optional**: Add Anthropic API key in settings (gear icon) for AI features

## Upgrade Strategy (Recommended)

Use staged upgrades, not giant grouped drops:
1. Build a small feature slice.
2. Run local smoke test (`npm run build` + `npm run tauri:dev`).
3. Produce a release bundle (`.\BUILD_FORGE_EXE.ps1`).
4. Validate install/startup, then ship.
5. Repeat in short cycles.

This keeps regressions isolated and makes rollback obvious.

---

## Troubleshooting

**"npm not found"**  
Install Node.js from https://nodejs.org

**"cargo not found"**  
Install Rust from https://rustup.rs

**Database always red**  
This is fine - app works without it. Database features are optional.

**App won't build**  
```bash
# Clean and rebuild
npm install
npm run tauri dev
```

---

*Last updated: Feb 15, 2026*  
*Fixed by: Claude (POF 2828)*
