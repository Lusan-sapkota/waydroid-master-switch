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
    this.menu.addAction('Stop All (Session + Container)', () => {
      this._runAction(() => this._stopAll(), 'stop all');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Start System Container', () => {
      this._runAction(() => this._startSystemContainer(), 'start system container');
    });
    this.menu.addAction('Stop System Container', () => {
      this._runAction(() => this._stopSystemContainer(), 'stop system container');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Start Session', () => {
      this._runAction(() => this._startSession(), 'start session');
    });
    this.menu.addAction('Stop Session', () => {
      this._runAction(() => this._stopSession(), 'stop session');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Phone Mode (540x960 @320)', () => {
      this._runAction(() => this._applyMode('phone'), 'apply phone mode');
    });
    this.menu.addAction('Tablet Mode (1280x800 @240)', () => {
      this._runAction(() => this._applyMode('tablet'), 'apply tablet mode');
    });
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addAction('Kill All', () => {
      this._runAction(() => this._killAll(), 'kill all');
    });

    this.connect('toggled', () => {
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
      return;
    }
    this._setBusy(true);
    try {
      await actionFn();
    } catch (error) {
      this._notifyError(description, error);
    } finally {
      this._setBusy(false);
      this._syncState();
    }
  }

  _setBusy(isBusy) {
    this._busy = isBusy;
    this.setSensitive(!isBusy);
  }

  async _handleToggle() {
    if (this.checked) {
      await this._startAll();
    } else {
      await this._stopAll();
    }
  }

  async _startAll() {
    await this._startSystemContainer();
    await this._startSession();
  }

  async _stopAll() {
    await this._stopSession();
    await this._stopSystemContainer();
  }

  async _startSystemContainer() {
    const active = await this._isContainerActive();
    if (active) {
      return;
    }
    await this._runCommand(['pkexec', 'systemctl', 'start', 'waydroid-container']);
  }

  async _stopSystemContainer() {
    const active = await this._isContainerActive();
    if (!active) {
      return;
    }
    await this._runCommand(['pkexec', 'systemctl', 'stop', 'waydroid-container']);
  }

  async _startSession() {
    const sessionRunning = await this._isSessionRunning();
    if (sessionRunning) {
      return;
    }
    const containerActive = await this._isContainerActive();
    if (!containerActive) {
      throw new Error('System container is inactive. Start it first.');
    }
    await this._runCommand(['waydroid', 'session', 'start']);
  }

  async _stopSession() {
    const sessionRunning = await this._isSessionRunning();
    if (!sessionRunning) {
      return;
    }
    await this._runCommand(['waydroid', 'session', 'stop']);
  }

  async _applyMode(modeName) {
    const mode = MODE_PROFILES[modeName];
    if (!mode) {
      throw new Error(`Unknown mode: ${modeName}`);
    }

    await this._runCommand(['waydroid', 'prop', 'set', 'persist.waydroid.width', `${mode.width}`]);
    await this._runCommand(['waydroid', 'prop', 'set', 'persist.waydroid.height', `${mode.height}`]);
    await this._runCommand(['waydroid', 'prop', 'set', 'persist.waydroid.dpi', `${mode.dpi}`]);

    const sessionRunning = await this._isSessionRunning();
    if (sessionRunning) {
      await this._stopSession();
      await this._startSession();
    }
  }

  async _killAll() {
    await this._runCommand(
      'waydroid session stop && pkexec systemctl stop waydroid-container',
      { shell: true }
    );
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
      const result = await runCommand(['waydroid', 'session', 'status']);
      if (result.status !== 0) {
        return false;
      }
      return result.stdout.toLowerCase().includes('running');
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
