# FORGE Note: AI Bar + Scroll Stacks

Date: 2026-03-05

Requested UX:
- Keep AI bar at bottom.
- Add stacked/scrollable sections under the taskbar area.
- Current items (Logic Editor, AI Workspace, AI Panel) should be scrollable with room for more sections.
- Support theme-like grouped dropdowns (3-4 sections initially).
- Preserve fast access and clean compact layout.

Implementation direction:
1. Dock shell remains fixed.
2. Add collapsible vertical stack container with independent scroll region.
3. Persist open/closed state per section.
4. Add section registry so new panels can be plugged in.
5. Expose section order + visibility in Settings.
