# Waydroid Master Switch

Waydroid Master Switch is a GNOME Shell extension that provides a single Quick Settings tile to control the Waydroid system container and user session. It also includes phone/tablet mode presets that apply Waydroid prop values and restart the session.

## Features

- Start/stop Waydroid system container (systemd service)
- Start/stop Waydroid user session
- Start All and Stop All actions for combined control
- Phone Mode (540x960 @ 320 DPI)
- Tablet Mode (1280x800 @ 240 DPI)
- Kill All sequence: stop session, then stop container

## Requirements

- Ubuntu with GNOME 50 (Wayland recommended)
- Waydroid installed and working
- pkexec (polkit) available for systemd control
- gnome-extensions CLI (installed with GNOME Shell)

## Install

### From GitHub

Symlink (recommended for updates):

```
git clone https://github.com/Lusan-sapkota/waydroid-master-switch.git
cd waydroid-master-switch
mkdir -p ~/.local/share/gnome-shell/extensions
ln -s "$(pwd)" ~/.local/share/gnome-shell/extensions/waydroid-master-switch@lusan
```

Copy (no symlink):

```
git clone https://github.com/Lusan-sapkota/waydroid-master-switch.git
mkdir -p ~/.local/share/gnome-shell/extensions
cp -r waydroid-master-switch ~/.local/share/gnome-shell/extensions/waydroid-master-switch@lusan
```

Enable the extension:

```
gnome-extensions enable waydroid-master-switch@lusan
```

Restart GNOME Shell:

- Wayland: log out and log back in
- X11: press Alt+F2, type r, press Enter

Verify:

```
gnome-extensions list | grep waydroid-master-switch
```

## Usage

Open Quick Settings and click the Waydroid tile:

- Toggle: starts or stops both the container and the session.
- Start All: start container, then session.
- Stop All: stop session, then container.
- Start/Stop System Container: control the systemd service only.
- Start/Stop Session: control the user session only.
- Phone/Tablet modes: set props then restart the session.
- Kill All: stop session and container in one sequence.

## Notes

- systemd actions use pkexec and will show the GNOME authentication dialog for your password.
- If you cancel the dialog, the action fails and a notification is shown.
