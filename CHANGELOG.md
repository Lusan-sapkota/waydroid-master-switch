# Changelog

All notable changes to this project will be documented in this file.

## [1.4] - 2026-05-10

### Added
- **Full Screen Mode**: New menu option that dynamically reads your monitor resolution and sets Waydroid to fill the screen.
- **Phone Mode (Fixed)**: Added a dedicated fixed-resolution (720x1280) mode for users who want to bypass auto-scaling.
- **Improved Mode Selection**: Renamed standard modes to "Auto" to clarify the smart-scaling behavior.

## [1.3] - 2026-05-10

### Added
- **Always on Top Toggle**: New menu action to force the Waydroid window to stay above all other windows.
- **Smart Auto-Adjust**: Automated logic to scale down Phone/Tablet mode resolutions if they exceed the laptop's screen height, preventing overflow.
- **Uninstall Script**: Added `uninstall.sh` for easy removal with a friendly goodbye message.
- **Improved Update Logic**: `install.sh` now attempts to disable, refresh, and re-enable the extension to apply code changes without a full logout (best-effort).

### Changed
- Refactored `install.sh` to be more robust and informative.
- Updated `README.md` with better instructions and troubleshooting tips.
- Improved logout/restart terminology for Wayland vs X11 users.

### Fixed
- Mode switching reliability issues where container restarts weren't always triggering property updates.
- Corrected installation path errors in documentation.

## [1.2] - 2026-05-10

### Added
- Basic Phone/Tablet mode switching.
- Container restart logic.

## [1.1] - 2026-05-10

### Added
- Initial Quick Settings integration.
- Session and Container status tracking.
