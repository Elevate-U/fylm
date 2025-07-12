#!/bin/bash

# Cleanup script to remove debug files after authentication issue is fixed
echo "🧹 Cleaning up debug files..."

# Remove debug files
rm -f debug-auth.js
rm -f AUTH-TROUBLESHOOTING.md
rm -f cleanup-debug.sh

echo "✅ Debug files removed successfully!"
echo "📝 Don't forget to remove debug console.log statements from production code if needed." 