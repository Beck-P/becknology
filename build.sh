#!/bin/bash
set -e

# Build runouts Vite app
cd apps/runouts && npm install && npm run build && cd ../..

# Assemble output directory
rm -rf public
mkdir -p public/apps

# Copy static apps
for dir in hub aether-seas typist genart placeholder-app; do
  if [ -d "apps/$dir" ]; then
    cp -r "apps/$dir" "public/apps/$dir"
  fi
done

# Copy built runouts
cp -r apps/runouts/dist public/runouts

echo "Build complete. Output in public/"
ls -la public/
