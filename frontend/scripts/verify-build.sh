#!/bin/bash
# Build Verification Script
# Verifies that development and production builds are correctly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verifying build configurations..."

# Check if dist directory exists
if [ -d "dist" ]; then
  echo -e "${YELLOW}⚠️  dist directory exists. Cleaning...${NC}"
  rm -rf dist
fi

# Test development build
echo ""
echo "📦 Testing development build..."
npm run build:dev

if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Development build failed: dist directory not created${NC}"
  exit 1
fi

# Check for source maps in development build
if find dist -name "*.map" | grep -q .; then
  echo -e "${GREEN}✅ Development build has source maps${NC}"
else
  echo -e "${YELLOW}⚠️  Development build missing source maps${NC}"
fi

# Check if files are minified (they shouldn't be in dev)
if grep -r "function\|const\|let\|var" dist/*.js 2>/dev/null | head -1 | grep -q "function\|const\|let\|var"; then
  echo -e "${GREEN}✅ Development build is not minified (as expected)${NC}"
else
  echo -e "${YELLOW}⚠️  Development build appears to be minified${NC}"
fi

# Clean up
rm -rf dist

# Test production build
echo ""
echo "📦 Testing production build..."
npm run build:prod

if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Production build failed: dist directory not created${NC}"
  exit 1
fi

# Check for source maps in production build (should not exist)
if find dist -name "*.map" | grep -q .; then
  echo -e "${YELLOW}⚠️  Production build has source maps (should be disabled)${NC}"
else
  echo -e "${GREEN}✅ Production build has no source maps (as expected)${NC}"
fi

# Check if files are minified (they should be in prod)
if grep -r "function\|const\|let\|var" dist/*.js 2>/dev/null | head -1 | grep -q "function\|const\|let\|var"; then
  echo -e "${YELLOW}⚠️  Production build appears not to be minified${NC}"
else
  echo -e "${GREEN}✅ Production build is minified (as expected)${NC}"
fi

# Check for manifest file
if [ -f "dist/.vite/manifest.json" ]; then
  echo -e "${GREEN}✅ Production build has manifest file${NC}"
else
  echo -e "${YELLOW}⚠️  Production build missing manifest file${NC}"
fi

# Get build size
BUILD_SIZE=$(du -sh dist | cut -f1)
echo ""
echo -e "${GREEN}✅ Build verification complete!${NC}"
echo "   Build size: $BUILD_SIZE"

# Clean up
rm -rf dist

echo ""
echo -e "${GREEN}✅ All build configurations verified successfully!${NC}"
