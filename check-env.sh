#!/bin/bash

# Diagnostic script for Camera Kiosk Browser environment
echo "--- Camera Kiosk Browser Diagnostics ---"
echo "Date: $(date)"
echo "User: $(whoami)"
echo "Groups: $(groups)"

echo -e "\n--- Filesystem Check ---"
echo "/tmp status:"
ls -ld /tmp
df -h /tmp

echo -e "\n/dev/shm status:"
ls -ld /dev/shm
df -h /dev/shm

echo -e "\n--- Directory Existence Check ---"
for dir in /tmp /dev/shm /var/tmp; do
    if [ -d "$dir" ]; then
        echo "$dir exists and is a directory."
        touch "$dir/test_write_$(whoami)" 2>/dev/null && echo "$dir is WRITABLE" && rm "$dir/test_write_$(whoami)" || echo "$dir is NOT WRITABLE"
    else
        echo "!!! $dir DOES NOT EXIST or is not a directory !!!"
    fi
done

echo -e "\n--- System Limits ---"
ulimit -a | grep -E "open files|max user processes"

echo -e "\n--- X11 / Display ---"
echo "DISPLAY=$DISPLAY"
if [ -z "$DISPLAY" ]; then
    echo "WARNING: DISPLAY variable is not set"
fi

echo -e "\n--- Chromium/Electron Potential Issues ---"
if [ -L /tmp ]; then
    echo "WARNING: /tmp is a symbolic link to: $(readlink -f /tmp)"
fi

echo "----------------------------------------"
