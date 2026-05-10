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

# Try to trigger a refresh of the extensions list (best effort)
if command -v dbus-send >/dev/null; then
    echo "Attempting to refresh GNOME extensions list via D-Bus..."
    dbus-send --type=method_call --dest=org.gnome.Shell /org/gnome/Shell org.gnome.Shell.Extensions.InstallRemoteExtension string 'dummy' >/dev/null 2>&1
    
    # Wait a moment for GNOME to process the refresh
    sleep 1
    
    echo "Attempting to enable extension..."
    if gnome-extensions enable "$EXT_ID" 2>/dev/null; then
        echo "Extension enabled successfully!"
        AUTO_ENABLED=true
    else
        echo "Note: Extension could not be enabled automatically yet (this is normal if GNOME needs a logout/restart)."
        AUTO_ENABLED=false
    fi
fi

echo "------------------------------------------"
echo "SUCCESS: Extension setup completed."
echo "------------------------------------------"

if [ "$AUTO_ENABLED" = false ]; then
    echo ""
    echo "IF THE EXTENSION IS NOT SHOWING in Quick Settings:"
    echo ""
    echo "1. Restart GNOME Shell / Logout (Required for first-time installs):"
    echo "   - Wayland (Ubuntu default): Log out and log back in."
    echo "   - X11: Press Alt+F2, type 'r', and press Enter."
    echo ""
    echo "2. Enable manually (if not already enabled):"
    echo "   gnome-extensions enable $EXT_ID"
    echo ""
    echo "3. Look for the Android icon in your Quick Settings menu."
    echo "------------------------------------------"
else
    echo ""
    echo "The extension is now active! Look for the Android icon in your Quick Settings."
    echo "------------------------------------------"
fi
