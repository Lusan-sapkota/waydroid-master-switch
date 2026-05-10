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
- pkexec available for systemd control

## Install

1. Copy or symlink this folder to:
   ~/.local/share/gnome-shell/extensions/waydroid-master-switch@lusan
2. Restart GNOME Shell (log out/in on Wayland).
3. Enable the extension:
   gnome-extensions enable waydroid-master-switch@lusan

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

- systemd actions use pkexec and may prompt for privileges.
