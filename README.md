# Waydroid Master Switch

Waydroid Master Switch is a GNOME Shell extension that provides a single Quick Settings tile to manage Waydroid system container and user session. It includes automated phone/tablet mode presets that apply Android display properties (resolution and DPI) and intelligently restart components to ensure modes take effect.

## Architecture

Waydroid has two separate components:

1. **System Container**: A systemd service (`waydroid-container`) running with elevated privileges. Controls Android OS lifecycle at the system level.
2. **User Session**: A per-user daemon (`waydroid session`) that runs Android and provides the UI/display session.

This extension manages both:
- Container operations require authentication via `pkexec` (polkit).
- Session operations run as the current user.

## Features

- **Container Control**: Start/stop the systemd `waydroid-container` service
- **Session Control**: Start/stop the user Waydroid session
- **Combined Actions**: Start All / Stop All / Kill All for common workflows
- **Mode Presets**: Phone (720x1280 @ 320 DPI) and Tablet (1280x800 @ 240 DPI)
- **Mid-flight Mode Switching**: Change resolution and DPI while session is running; extension restarts session to apply mode
- **Non-blocking UI**: All operations run detached; extension doesn't freeze while waiting
- **Status Display**: Header shows live Session and Container state
- **Always on Top Toggle**: Keep the Waydroid window floating above other windows
- **Smart Auto-Adjust**: Automatically scales mode resolution to fit your laptop screen
- **Logging**: All actions logged to systemd journal for debugging

See the [CHANGELOG.md](CHANGELOG.md) for a full history of updates.

## Requirements

- Ubuntu with GNOME 50 (Wayland recommended)
- Waydroid installed and working
- `pkexec` (polkit) available for systemd control
- `gnome-extensions` CLI (installed with GNOME Shell)

## Install & Update

> [!IMPORTANT]
> You can clone this repository anywhere you like, but you **must** be inside the project folder (`cd waydroid-master-switch`) when running the scripts.

The easiest way to install or update the extension is using the provided `install.sh` script.

### 1. Clone or Pull the latest code

```bash
git clone https://github.com/Lusan-sapkota/waydroid-master-switch.git
cd waydroid-master-switch
# Or if already cloned: git pull
```

### 2. Run the installer

```bash
bash install.sh
```

The script will attempt to refresh GNOME and enable the extension automatically. **If it succeeds, you are done!**

---

### Manual Setup (If script fails)

If the extension doesn't appear after running the script, follow these manual steps:

**3. Restart GNOME Shell / Logout**
- **Wayland (Ubuntu default)**: Log out and log back in.
- **X11**: Press Alt+F2, type 'r', and press Enter.

**4. Enable the extension**
```bash
gnome-extensions enable waydroid-master-switch@lusan
```

**Verify:**
```bash
gnome-extensions list | grep waydroid-master-switch
```

## Uninstall

Make sure you are inside the repository folder, then run:

```bash
bash uninstall.sh
```

## Usage

### Quick Settings Menu

Open Quick Settings and look for the Waydroid tile (Android icon). The tile shows:
- **Title**: "Waydroid"
- **Header**: "Session: [running|stopped] | Container: [active|inactive]"
- **Menu**: List of actions

### Menu Actions

#### Start All (Container + Session)

**What it does**: Ensures the container is running, then starts the user session.

**Flow**:
1. Check if container is already active; if not, request authentication and start it.
2. Poll container status up to 30 seconds for startup.
3. Check if session is already running; if so, skip session start.
4. Start the user session; poll for up to 20 seconds.
5. Return combined status (e.g., "Waydroid system container is already running; Started Waydroid session").

**When to use**: Initial startup; ensures a complete, working Waydroid environment.

**Notifications**:
- "Running start all..."
- "Requesting authentication to start Waydroid container" (if auth required)
- Result: "Waydroid system container is already running; Started Waydroid session"

#### Start Session

**What it does**: Starts the user session only. Requires container to already be active.

**Flow**:
1. Check if session is already running; if so, return early.
2. Verify container is active; if not, fail with clear error.
3. Start session; poll for up to 20 seconds.

**When to use**: After restarting the desktop or recovering a crashed session, while container is still active.

**Prerequisite**: Container must be active.

#### Phone Mode (720x1280 @ 320 DPI)

**What it does**: Configures Android to emulate a phone display (larger resolution, higher DPI for scaling).

> **Smart Auto-Adjust**: If your laptop screen height is shorter than the requested Phone Mode height (e.g., on a 1080p display), the extension will automatically scale down the width, height, and DPI to perfectly fit your screen without clipping or overflowing!

**Flow**:
1. Set Android system properties:
   - `persist.waydroid.width`: 720 (scaled if needed)
   - `persist.waydroid.height`: 1280 (scaled if needed)
   - `persist.waydroid.dpi`: 320 (scaled if needed)
2. Verify properties were actually set; fail if verification fails.
3. **If session is running (mid-flight mode change)**:
   - Stop the session.
   - Stop the container.
   - Start the container again (ensures Android reads new properties).
   - Start the session again (UI applies new resolution/scaling).
4. **If session is not running**:
   - Properties are set and verified; next session start will use new values.

**When to use**: Want phone-sized Android UI; testing phone apps; changing display mode while Waydroid is running.

**Expected behavior**:
- If already running: session restarts (may take 5-15 seconds), then UI appears in phone layout.
- If not running: mode is ready; start session and you'll get phone layout.

**Result message**: "Configured Phone Mode (720x1280@320); Stopped Waydroid session; Stopped Waydroid system container; Started Waydroid system container; Started Waydroid session"

#### Tablet Mode (1280x800 @ 240 DPI)

**What it does**: Configures Android to emulate a tablet display (wide resolution, lower DPI).

**Flow**: Same as Phone Mode, but with tablet values (1280x800@240). Auto-adjust is also applied here if the screen is too small.

**When to use**: Want tablet-sized Android UI; testing tablet apps.

#### Toggle Window Always on Top

**What it does**: Finds the Waydroid window on your current workspace and forces it to stay above all other windows. Clicking it again removes the always-on-top state.

**When to use**: When you want to keep the Android UI floating over your browser or text editor while you work.

#### Start/Stop System Container

**What it does**: Directly control the `waydroid-container` systemd service.

**Start System Container**:
1. Request authentication (if not already authenticated).
2. Spawn `pkexec systemctl start waydroid-container` detached.
3. Poll service status up to 30 seconds.
4. Return "Started Waydroid system container" or fail with timeout.

**Stop System Container**:
1. Request authentication.
2. Spawn `pkexec systemctl stop waydroid-container` detached.
3. Poll service status up to 30 seconds.
4. Return "Stopped Waydroid system container" or fail with timeout.

**When to use**: Manual container restart; troubleshooting; stopping Waydroid completely.

**Note**: Requires authentication. If you dismiss the password prompt, the action times out after 30 seconds.

#### Stop Session

**What it does**: Stops the user session only. Container remains active.

**Flow**:
1. Check if session is already stopped; if so, return early.
2. Stop session; poll for up to 20 seconds.

**When to use**: Pause Waydroid UI; debug; restart session without restarting container.

#### Stop All (Session + Container)

**What it does**: Cleanly stop both session and container.

**Flow**:
1. Stop session (poll up to 20 seconds).
2. Stop container (request auth, poll up to 30 seconds).

**When to use**: Shut down Waydroid completely.

#### Kill All

**What it does**: Emergency stop sequence in a single action (combines session stop + container stop).

**Flow**:
1. Run `waydroid session stop && pkexec systemctl stop waydroid-container` in shell mode (detached).
2. Container stop uses `pkexec` (request authentication).
3. No polling; fires both commands in parallel.

**When to use**: Quick shutdown; killing a frozen or unresponsive session/container.

**Note**: If you cancel the polkit dialog, the container stop may fail.

#### Toggle (Header Checkbox)

**What it does**: Clicking the main Waydroid toggle starts/stops all.

- **Checked** (ON): Runs Start All.
- **Unchecked** (OFF): Runs Stop All.

**Note**: Toggle state is derived from session state; not independently maintained.

### State Header

The menu header displays live status:

```
Session: [running|stopped] | Container: [active|inactive]
```

Updates every 15 seconds automatically, or after each action completes.

## Workflow Examples

### First Boot / Cold Start

1. Open Quick Settings.
2. Click `Start All (Container + Session)`.
3. You'll see:
   - "Running start all..."
   - "Requesting authentication to start Waydroid container" (polkit dialog).
   - Enter password.
   - Wait for notifications and header update.
   - Header shows "Session: running | Container: active".

### Switch Display Mode While Running

1. Session is running (verified in header).
2. Click `Phone Mode`.
3. Extension logs: "Mode changed mid-flight; restarting session to apply Phone Mode".
4. Session stops, container restarts, session starts.
5. After restart, UI appears in 720x1280 phone layout.

### Restart Session (Keep Container)

1. Container is active, session crashed or frozen.
2. Click `Stop Session`.
3. Click `Start Session`.
4. Session restarts; container stays active.

### Shutdown

1. Click `Stop All (Session + Container)`.
2. Both components shut down cleanly.
3. Header shows "Session: stopped | Container: inactive".

## Troubleshooting

### Polkit Prompt Doesn't Appear

**Symptom**: Container start/stop actions time out with "Timed out waiting for...".

**Cause**: Missing or misconfigured polkit agent; GNOME not providing auth dialog.

**Solution**:

1. Check polkit agent is running:
   ```bash
   ps aux | grep polkit-gnome-authentication-agent
   ```

2. If missing, restart GNOME Shell:
   - Wayland: Log out and back in.
   - X11: Alt+F2, type `r`, Enter.

3. If you want passwordless container control, create a polkit rule:
   ```bash
   sudo tee /etc/polkit-1/rules.d/49-waydroid.rules >/dev/null <<EOF
   polkit.addRule(function(action, subject) {
     if (action.id == "org.freedesktop.systemd1.manage-unit-files" ||
         action.id == "org.freedesktop.systemd1.manage-units" ||
         action.id == "org.freedesktop.systemd1.start-unit") {
       if (action.annotations["unit"] == "waydroid-container.service") {
         return polkit.Result.YES;
       }
     }
     return polkit.Result.NOT_HANDLED;
   });
   EOF
   ```

4. Reload polkit:
   ```bash
   sudo systemctl restart polkit
   ```

### Session Start Fails After Mode Change

**Symptom**: Mode change times out or returns "Session start pending".

**Cause**: Session took longer than 20 seconds to start (rare).

**Solution**:

1. Wait 10 seconds and click `Start Session` again.
2. If still fails, check container is active:
   ```bash
   systemctl is-active waydroid-container
   ```
3. If container is inactive, click `Start All`.

### Properties Show as Set But Mode Doesn't Appear

**Symptom**: Mode action completes and logs show verified values, but UI still looks "monitor-sized".

**Cause**: Mode properties set, but session not restarted to apply them (race condition).

**Solution**:

1. Click `Stop Session`, then `Start Session`.
2. Or click the same mode again (mid-flight restart will force restart).

### Check Current Props

```bash
waydroid prop get persist.waydroid.width
waydroid prop get persist.waydroid.height
waydroid prop get persist.waydroid.dpi
```

### Check Session/Container State

```bash
waydroid status
systemctl is-active waydroid-container
```

## Debugging

### View Extension Logs

All extension actions are logged to the systemd user journal:

```bash
journalctl --user -b -f -o cat | grep waydroid-master-switch
```

Example output:

```
[waydroid-master-switch] Loaded build: 2026-05-10-mode-debug-1
[waydroid-master-switch] Action requested: start all
[waydroid-master-switch] Invoking pkexec to start system container (detached)
[waydroid-master-switch] detached child exited: true
[waydroid-master-switch] Container already active; skipping pkexec start
[waydroid-master-switch] Starting Waydroid session (detached)
[waydroid-master-switch] Action completed: start all -> Waydroid system container is already running; Started Waydroid session
```

### Debug Mode Changes

Watch logs while changing mode:

```bash
journalctl --user -b -f -o cat | grep -E "waydroid-master-switch|Mode changed"
```

Click a mode and observe the full restart sequence in logs.

## Notes

- **Authentication**: Container start/stop use `pkexec` and require your system password. If you dismiss the polkit dialog, the action times out with an error notification.
- **Idempotency**: All actions check state first; starting an already-running session or container just returns "already running" without re-executing.
- **Non-blocking**: Operations spawn detached and poll status; the GNOME Shell UI remains responsive.
- **Mode properties**: Waydroid caches and persists display properties; modes set remain active even after reboot.
- **Wayland required**: Full-screen Waydroid UI (wayland-0) works best on Wayland sessions.

## License

MIT
