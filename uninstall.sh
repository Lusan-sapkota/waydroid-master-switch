#!/bin/bash

# Waydroid Master Switch - Uninstaller
# This script removes the extension from your local GNOME extensions directory.

EXT_ID="waydroid-master-switch@lusan"
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_ID"

echo "------------------------------------------"
echo "Waydroid Master Switch Uninstaller"
echo "------------------------------------------"

# Disable the extension first
if gnome-extensions list | grep -q "$EXT_ID"; then
    echo "Disabling extension..."
    gnome-extensions disable "$EXT_ID" 2>/dev/null
fi

# Remove the directory
if [ -d "$DEST_DIR" ]; then
    echo "Removing extension files from $DEST_DIR ..."
    rm -rf "$DEST_DIR"
    REMOVED=true
else
    echo "Note: Extension files were not found at $DEST_DIR."
    REMOVED=false
fi

# Try to trigger a refresh of the extensions list (best effort)
REFRESHED=false
if [ "$REMOVED" = true ] && command -v dbus-send >/dev/null; then
    echo "Attempting to refresh GNOME extensions list via D-Bus..."
    if dbus-send --type=method_call --dest=org.gnome.Shell /org/gnome/Shell org.gnome.Shell.Extensions.InstallRemoteExtension string 'dummy' >/dev/null 2>&1; then
        REFRESHED=true
    fi
fi

echo "------------------------------------------"
if [ "$REMOVED" = true ]; then
    echo "SUCCESS: Waydroid Master Switch has been uninstalled."
    if [ "$REFRESHED" = false ]; then
        echo ""
        echo "NOTE: GNOME Shell might still show the extension until you logout/restart."
        echo "1. Logout and log back in (Wayland) or press Alt+F2, r, Enter (X11)."
    fi
    echo ""
    echo "Thank you for using Waydroid Master Switch! Hope to see you back soon. :)"
else
    echo "Nothing to do."
fi
echo "------------------------------------------"
