import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const MODE_PROFILES = {
  phone: { label: 'Phone Mode', width: 540, height: 960, dpi: 320 },
  tablet: { label: 'Tablet Mode', width: 1280, height: 800, dpi: 240 },
};

function runCommand(command, { shell = false } = {}) {
  return new Promise((resolve, reject) => {
    let argv = command;
    try {
      if (shell) {
        argv = ['/bin/sh', '-c', command];
      }
      const proc = Gio.Subprocess.new(
        argv,
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
      );
      proc.communicate_utf8_async(null, null, (proc, res) => {
        try {
          const [, stdout, stderr] = proc.communicate_utf8_finish(res);
          const status = proc.get_exit_status();
          resolve({ stdout: stdout.trim(), stderr: stderr.trim(), status });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function runCommandDetached(command, { shell = false } = {}) {
  let argv = command;
  if (shell) {
    argv = ['/bin/sh', '-c', command];
  }

  try {
    const flags = Gio.SubprocessFlags.NONE;
    const proc = Gio.Subprocess.new(argv, flags);
    proc.wait_async(null, (p, res) => {
      try {
        const resCode = p.wait_finish(res);
        log(`[waydroid-master-switch] detached child exited: ${resCode}`);
      } catch (e) {
        log(`[waydroid-master-switch] detached child wait error: ${e}`);
      }
    });
    return proc;
  } catch (e) {
    throw new Error(`Failed to spawn detached command: ${e}`);
  }
}

const WaydroidToggle = GObject.registerClass(
class WaydroidToggle extends QuickSettings.QuickMenuToggle {
  _init() {
    super._init({
      title: 'Waydroid',
      iconName: 'android-symbolic',
      toggleMode: true,
    });

    this.menu.setHeader(
      'android-symbolic',
      'Waydroid Master Switch',
      'Session: unknown | Container: unknown'
    );

    this._busy = false;
    this._suppressToggle = false;
    this._syncing = false;

    this.menu.addAction('Start All (Container + Session)', () => {
      this._runAction(() => this._startAll(), 'start all');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Start Session', () => {
      this._runAction(() => this._startSession(), 'start session');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Phone Mode (540x960 @320)', () => {
      this._runAction(() => this._applyMode('phone'), 'apply phone mode');
    });
    this.menu.addAction('Tablet Mode (1280x800 @240)', () => {
      this._runAction(() => this._applyMode('tablet'), 'apply tablet mode');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Start System Container', () => {
      this._runAction(() => this._startSystemContainer(), 'start system container');
    });
    this.menu.addAction('Stop Session', () => {
      this._runAction(() => this._stopSession(), 'stop session');
    });
    this.menu.addAction('Stop System Container', () => {
      this._runAction(() => this._stopSystemContainer(), 'stop system container');
    });
    this.menu.addAction('Stop All (Session + Container)', () => {
      this._runAction(() => this._stopAll(), 'stop all');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Kill All', () => {
      this._runAction(() => this._killAll(), 'kill all');
    });

    this.connect('notify::checked', () => {
      if (this._suppressToggle) {
        return;
      }
      this._runAction(() => this._handleToggle(), 'toggle waydroid');
    });

    this._statusTimerId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      15,
      () => {
        this._syncState();
        return GLib.SOURCE_CONTINUE;
      }
    );

    this._syncState();
  }

  destroy() {
    if (this._statusTimerId) {
      GLib.Source.remove(this._statusTimerId);
      this._statusTimerId = 0;
    }
    super.destroy();
  }

  async _runAction(actionFn, description) {
    if (this._busy) {
      this._log(`Action skipped (busy): ${description}`);
      return;
    }
    try {
      this._setBusy(true);
      this._log(`Action requested: ${description}`);
      this._notifyInfo(`Running ${description}...`);
      const result = await actionFn();
      if (result) {
        this._notifyInfo(result);
        this._log(`Action completed: ${description} -> ${result}`);
      } else {
        this._log(`Action completed: ${description}`);
      }
    } catch (error) {
      this._notifyError(description, error);
      this._log(`Action failed: ${description} -> ${error?.message ?? error}`);
    } finally {
      this._setBusy(false);
      this._syncState().catch(error => {
        this._log(`State sync failed: ${error?.message ?? error}`);
      });
    }
  }

  _setBusy(isBusy) {
    this._busy = isBusy;
  }

  async _handleToggle() {
    if (this.checked) {
      await this._startAll();
    } else {
      await this._stopAll();
    }
  }

  async _startAll() {
    const parts = [];
    parts.push(await this._startSystemContainer());

    const sessionRunning = await this._isSessionRunning();
    if (sessionRunning) {
      parts.push('Waydroid session is already running');
      return parts.filter(Boolean).join('; ');
    }

    try {
      parts.push(await this._startSession());
    } catch (error) {
      this._log(`Session start attempt 1 failed: ${error?.message ?? error}`);
      await new Promise(r => GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => { r(); return GLib.SOURCE_REMOVE; }));
      try {
        parts.push(await this._startSession());
      } catch (retryError) {
        this._log(`Session start attempt 2 failed: ${retryError?.message ?? retryError}`);
        const runningAfterRetry = await this._isSessionRunning();
        if (runningAfterRetry) {
          parts.push('Waydroid session is running');
        } else {
          parts.push(`Session start pending: ${retryError?.message ?? retryError}`);
        }
      }
    }

    return parts.filter(Boolean).join('; ');
  }

  async _stopAll() {
    const parts = [];
    parts.push(await this._stopSession());
    parts.push(await this._stopSystemContainer());
    return parts.filter(Boolean).join('; ');
  }

  async _startSystemContainer() {
    const active = await this._isContainerActive();
    if (active) {
      this._log('Container already active; skipping pkexec start');
      return 'Waydroid system container is already running';
    }
    this._log('Invoking pkexec to start system container (detached)');
    this._notifyInfo('Requesting authentication to start Waydroid container');

    // Spawn pkexec detached so we don't block the UI; then poll status.
    runCommandDetached(['pkexec', 'systemctl', 'start', 'waydroid-container']);

    // Wait for the container to appear active (poll), but avoid hanging forever.
    const timeout = 30; // seconds
    const interval = 2; // seconds
    let waited = 0;
    while (waited < timeout) {
      await new Promise(r => GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => { r(); return GLib.SOURCE_REMOVE; }));
      waited += interval;
      const nowActive = await this._isContainerActive();
      if (nowActive) {
        return 'Started Waydroid system container';
      }
    }

    throw new Error('Timed out waiting for waydroid-container to start (polkit prompt may have been dismissed)');
  }

  async _stopSystemContainer() {
    const active = await this._isContainerActive();
    if (!active) {
      this._log('Container already inactive; skipping pkexec stop');
      return 'Waydroid system container is already stopped';
    }
    this._log('Invoking pkexec to stop system container (detached)');
    this._notifyInfo('Requesting authentication to stop Waydroid container');
    runCommandDetached(['pkexec', 'systemctl', 'stop', 'waydroid-container']);

    const timeout = 30; // seconds
    const interval = 2; // seconds
    let waited = 0;
    while (waited < timeout) {
      await new Promise(r => GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => { r(); return GLib.SOURCE_REMOVE; }));
      waited += interval;
      const nowActive = await this._isContainerActive();
      if (!nowActive) {
        return 'Stopped Waydroid system container';
      }
    }

    throw new Error('Timed out waiting for waydroid-container to stop (polkit prompt may have been dismissed)');
  }

  async _startSession() {
    const sessionRunning = await this._isSessionRunning();
    if (sessionRunning) {
      return 'Waydroid session is already running';
    }
    const containerActive = await this._isContainerActive();
    if (!containerActive) {
      throw new Error('System container is inactive. Start it first.');
    }

    this._log('Starting Waydroid session (detached)');
    runCommandDetached(['waydroid', 'session', 'start']);

    const timeout = 20; // seconds
    const interval = 1; // seconds
    let waited = 0;
    while (waited < timeout) {
      await new Promise(r => GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => { r(); return GLib.SOURCE_REMOVE; }));
      waited += interval;
      const nowRunning = await this._isSessionRunning();
      if (nowRunning) {
        return 'Started Waydroid session';
      }
    }

    throw new Error('Timed out waiting for Waydroid session to start');
  }

  async _stopSession() {
    const sessionRunning = await this._isSessionRunning();
    if (!sessionRunning) {
      return 'Waydroid session is already stopped';
    }

    this._log('Stopping Waydroid session (detached)');
    runCommandDetached(['waydroid', 'session', 'stop']);

    const timeout = 20; // seconds
    const interval = 1; // seconds
    let waited = 0;
    while (waited < timeout) {
      await new Promise(r => GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => { r(); return GLib.SOURCE_REMOVE; }));
      waited += interval;
      const nowRunning = await this._isSessionRunning();
      if (!nowRunning) {
        return 'Stopped Waydroid session';
      }
    }

    throw new Error('Timed out waiting for Waydroid session to stop');
  }

  async _applyMode(modeName) {
    const mode = MODE_PROFILES[modeName];
    if (!mode) {
      throw new Error(`Unknown mode: ${modeName}`);
    }

    const wasSessionRunning = await this._isSessionRunning();
    const wasContainerActive = await this._isContainerActive();

    await this._runCommand(['waydroid', 'prop', 'set', 'persist.waydroid.width', `${mode.width}`]);
    await this._runCommand(['waydroid', 'prop', 'set', 'persist.waydroid.height', `${mode.height}`]);
    await this._runCommand(['waydroid', 'prop', 'set', 'persist.waydroid.dpi', `${mode.dpi}`]);

    await this._verifyModeProps(mode);

    const parts = [`Configured ${mode.label} properties`];

    if (wasSessionRunning) {
      parts.push(await this._stopSession());
    }

    if (wasContainerActive) {
      parts.push(await this._stopSystemContainer());
      parts.push(await this._startSystemContainer());
    }

    if (wasSessionRunning) {
      parts.push(await this._startSession());
    }

    return parts.filter(Boolean).join('; ');
  }

  _parseNumericProp(rawValue, propName) {
    const match = `${rawValue}`.match(/-?\d+/);
    if (!match) {
      throw new Error(`Unable to parse ${propName} value from: ${rawValue}`);
    }
    return Number.parseInt(match[0], 10);
  }

  async _verifyModeProps(mode) {
    const widthRaw = (await this._runCommand(['waydroid', 'prop', 'get', 'persist.waydroid.width'])).stdout;
    const heightRaw = (await this._runCommand(['waydroid', 'prop', 'get', 'persist.waydroid.height'])).stdout;
    const dpiRaw = (await this._runCommand(['waydroid', 'prop', 'get', 'persist.waydroid.dpi'])).stdout;

    const width = this._parseNumericProp(widthRaw, 'persist.waydroid.width');
    const height = this._parseNumericProp(heightRaw, 'persist.waydroid.height');
    const dpi = this._parseNumericProp(dpiRaw, 'persist.waydroid.dpi');

    if (width !== mode.width || height !== mode.height || dpi !== mode.dpi) {
      throw new Error(
        `Mode verification failed (expected ${mode.width}x${mode.height}@${mode.dpi}, got ${width}x${height}@${dpi})`
      );
    }
  }

  async _killAll() {
    this._log('Executing Kill All (session stop + pkexec stop container)');
    this._notifyInfo('Killing Waydroid session and requesting authentication to stop container');
    await this._runCommand(
      'waydroid session stop && pkexec systemctl stop waydroid-container',
      { shell: true }
    );
    return 'Stopped Waydroid session and system container';
  }

  async _syncState() {
    if (this._syncing) {
      return;
    }
    this._syncing = true;
    try {
      const sessionRunning = await this._isSessionRunning();
      const containerActive = await this._isContainerActive();
      const statusText = `Session: ${sessionRunning ? 'running' : 'stopped'} | Container: ${containerActive ? 'active' : 'inactive'}`;

      this.menu.setHeader('android-symbolic', 'Waydroid Master Switch', statusText);

      this._suppressToggle = true;
      this.checked = sessionRunning;
      this._suppressToggle = false;
    } finally {
      this._syncing = false;
    }
  }

  async _isSessionRunning() {
    try {
      const result = await runCommand(['waydroid', 'status']);
      if (result.status !== 0) {
        return false;
      }

      const sessionLine = result.stdout
        .split('\n')
        .find(line => line.toLowerCase().startsWith('session:'));
      if (!sessionLine) {
        return false;
      }

      return /session:\s*running/i.test(sessionLine);
    } catch (error) {
      return false;
    }
  }

  async _isContainerActive() {
    try {
      const result = await runCommand(['systemctl', 'is-active', 'waydroid-container']);
      if (result.status !== 0) {
        return false;
      }
      return result.stdout.trim() === 'active';
    } catch (error) {
      return false;
    }
  }

  async _runCommand(command, options = {}) {
    const result = await runCommand(command, options);
    if (result.status !== 0) {
      const message = result.stderr || result.stdout || 'Command failed.';
      throw new Error(message);
    }
    return result;
  }

  _notifyError(action, error) {
    const message = error && error.message ? error.message : `${error}`;
    Main.notify('Waydroid Master Switch', `Failed to ${action}: ${message}`);
  }

  _notifyInfo(message) {
    Main.notify('Waydroid Master Switch', message);
  }

  _log(message) {
    log(`[waydroid-master-switch] ${message}`);
  }
}
);

export default class WaydroidMasterSwitch extends Extension {
  enable() {
    this._indicator = new QuickSettings.SystemIndicator();
    this._toggle = new WaydroidToggle();

    this._indicator.quickSettingsItems.push(this._toggle);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
    this._toggle = null;
  }
}
