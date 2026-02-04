#!/bin/bash

# Toast Setup Script for CineQ Dashboard
echo "Setting up Toast Notifications..."

# 1. Install dependencies (if not already installed)
echo "Installing dependencies..."
npm install ngx-toastr @angular/animations --legacy-peer-deps

# 2. Check if styles.scss import exists
echo "Checking styles.scss..."
if ! grep -q "ngx-toastr/toastr" src/styles.scss; then
    echo "Adding toast CSS import to styles.scss..."
    sed -i '/\/\/ main framework/i // Toast notifications\n@import '\''ngx-toastr/toastr'\'';\n' src/styles.scss
fi

# 3. Check if main.ts provider exists
echo "Checking main.ts..."
if ! grep -q "provideToastr" src/main.ts; then
    echo "Please manually add provideToastr to main.ts (see TOAST_SETUP.md)"
fi

echo "Toast setup complete! Check TOAST_SETUP.md for manual steps."