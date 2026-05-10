# Changelog

All notable changes to this project will be documented in this file.

## [1.2] - 2026-05-10

### Added
- Added a binder preflight check before applying mode changes.
- Mode changes now fail fast with a clear message when Waydroid binder support is missing.

### Fixed
- Prevented Phone/Tablet mode actions from hanging the shell when `waydroid prop set` waits on a missing binder service manager.

## [1.1] - 2026-05-10

### Added
- Phone mode preset updated to 720x1280 @ 320 DPI.
- Mode application now restarts the session when needed so display changes take effect reliably.
- More detailed README documentation for every action, mode workflow, and troubleshooting flow.

### Changed
- Improved Start All / Stop All behavior for mixed container/session states.
- Improved Waydroid state detection to use `waydroid status`.
- Added clearer journal logging and runtime status messages.

### Fixed
- Avoided parsing errors when Waydroid properties are unavailable while the session is stopped.
- Prevented empty or invalid prop output from breaking mode application.

## [1.0] - 2026-05-10

### Added
- Initial release of Waydroid Master Switch.
- Quick Settings tile for Waydroid container and session control.
- Start All, Stop All, Start Session, Stop Session, Start/Stop System Container, and Kill All actions.
- Phone and tablet mode presets.
- Notifications and journal logging for actions.
