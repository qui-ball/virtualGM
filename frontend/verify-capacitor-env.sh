#!/bin/bash
# Verification script for Capacitor environment variable setup

set -e

echo "🔍 Verifying Capacitor Environment Variable Setup"
echo "=================================================="
echo ""

# Check if .env files exist
echo "📁 Checking environment files..."
if [ -f ".env.example" ]; then
    echo "  ✅ .env.example exists"
else
    echo "  ❌ .env.example missing"
    exit 1
fi

if [ -f ".env.development" ]; then
    echo "  ✅ .env.development exists"
else
    echo "  ⚠️  .env.development missing (optional, but recommended)"
fi

if [ -f ".env.production" ]; then
    echo "  ✅ .env.production exists"
else
    echo "  ⚠️  .env.production missing (optional, but recommended)"
fi

echo ""

# Check capacitor.config.ts
echo "⚙️  Checking capacitor.config.ts..."
if grep -q "dotenv" capacitor.config.ts 2>/dev/null; then
    echo "  ✅ capacitor.config.ts uses dotenv"
else
    echo "  ❌ capacitor.config.ts doesn't use dotenv"
    exit 1
fi

if grep -q "VITE_CAPACITOR_DEV_SERVER_URL\|CAPACITOR_DEV_SERVER_URL" capacitor.config.ts 2>/dev/null; then
    echo "  ✅ capacitor.config.ts reads dev server URL"
else
    echo "  ❌ capacitor.config.ts doesn't read dev server URL"
    exit 1
fi

echo ""

# Check if dotenv is installed
echo "📦 Checking dependencies..."
if npm list dotenv >/dev/null 2>&1; then
    echo "  ✅ dotenv is installed"
else
    echo "  ❌ dotenv is not installed"
    echo "     Run: npm install --save-dev dotenv"
    exit 1
fi

echo ""

# Test loading environment variables
echo "🧪 Testing environment variable loading..."
NODE_ENV=development node -e "
const { config } = require('dotenv');
const { resolve } = require('path');
config({ path: resolve(__dirname, '.env.development') });
config({ path: resolve(__dirname, '.env') });
console.log('  VITE_API_URL:', process.env.VITE_API_URL || 'not set');
console.log('  VITE_CAPACITOR_DEV_SERVER_URL:', process.env.VITE_CAPACITOR_DEV_SERVER_URL || 'not set');
console.log('  VITE_APP_NAME:', process.env.VITE_APP_NAME || 'not set');
" 2>/dev/null || echo "  ⚠️  Could not test (Node.js required)"

echo ""
echo "✅ Verification complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Copy .env.example to .env.development and .env.production"
echo "  2. Fill in your values (especially VITE_API_URL)"
echo "  3. For mobile dev, set VITE_CAPACITOR_DEV_SERVER_URL to your local IP"
echo "  4. Build: npm run build -- --mode development"
echo "  5. Sync: npx cap sync"
