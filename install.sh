#!/bin/bash

# Waydroid Master Switch - Easy Installer/Updater
# This script sets up the GNOME extension in the local user directory.

EXT_ID="waydroid-master-switch@lusan"
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_ID"

echo "------------------------------------------"
echo "Waydroid Master Switch Installer/Updater"
echo "------------------------------------------"

# Ensure the extensions directory exists
mkdir -p "$HOME/.local/share/gnome-shell/extensions"

# Check if we are in the correct directory (has extension.js)
if [ ! -f "extension.js" ]; then
    echo "Error: Please run this script from inside the waydroid-master-switch directory."
    exit 1
fi

if [ -d "$DEST_DIR" ]; then
    echo "Existing installation found at $DEST_DIR"
    
    if [ -L "$DEST_DIR" ]; then
        echo "Detected Symlink installation. Updating source via git pull..."
        git pull
    else
        echo "Updating standalone installation (copying files)..."
        cp -rf . "$DEST_DIR/"
    fi
else
    echo "Installing extension to $DEST_DIR ..."
    cp -rf . "$DEST_DIR/"
fi

echo "------------------------------------------"
echo "SUCCESS: Extension files are in place."
echo "------------------------------------------"
echo ""
echo "IMPORTANT: GNOME Shell must be restarted to recognize new extensions."
echo ""
echo "1. Restart GNOME Shell:"
echo "   - Wayland (Ubuntu default): Log out and log back in."
echo "   - X11: Press Alt+F2, type 'r', and press Enter."
echo ""
echo "2. Enable the extension:"
echo "   gnome-extensions enable $EXT_ID"
echo ""
echo "3. Open Quick Settings to find the Waydroid tile."
echo "------------------------------------------"
