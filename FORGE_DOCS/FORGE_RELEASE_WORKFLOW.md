# FORGE Release Workflow

## Purpose
Make FORGE shippable as a reliable Windows desktop program (not only dev mode).

## Canonical Inputs Used
- `O:\FORGE\_FORGE_SOURCE\package.json`
- `O:\FORGE\_FORGE_SOURCE\src-tauri\tauri.conf.json`
- `O:\FORGE\_FORGE_SOURCE\LAUNCH_README.md`

## Structured Output

### Release cadence
1. Use small, staged upgrades.
2. Cut a build after each stable slice.
3. Ship frequently with short validation loops.
4. Avoid bundling many untested features into one release.

### Build path
1. Preflight dependencies (`npm`, `cargo`, `link.exe`).
2. Build frontend (`npm run build`).
3. Build desktop bundle (`npm run tauri:build`).
4. Collect artifacts from `src-tauri\target\release\bundle\`.

### Minimum release gate
1. App launches.
2. Vault open/read/write works.
3. Editor save and reload works.
4. DB failure still degrades gracefully (local mode).
5. One create/rename/delete note workflow passes.

### Loose-end checklist
1. Reduce large JS bundle warning via code splitting.
2. Confirm installer target (`msi` vs `nsis`) in Tauri bundle config.
3. Add release notes file per build with known issues.
4. Add version bump discipline (`package.json` + `tauri.conf.json`).

## Audit Footer

### 1) Where We Are Right
- Tauri is the correct path to produce a true Windows desktop executable/installer.
- Staged upgrades reduce blast radius and speed up debugging.
- A preflight script prevents repeat build failures from missing toolchain.

### 2) Where We Might Be Wrong
- If release speed is less important than synchronized feature drops, bigger grouped releases may fit your workflow.
- If the target machine set is constrained, installer choice could change deployment needs.

### 3) What We Think
- Build this like a product: short, stable release loops beat giant update bundles for FORGE.
