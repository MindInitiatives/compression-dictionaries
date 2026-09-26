# Compress this release's assets against the previous release's.
# Run with --dry-run first to see which files pair up.
./node_modules/.bin/build-deltas \
  --preset vite \
  --current dist/assets \
  --previous releases/v1/assets \
  --public-path /assets \
  --out dist/deltas
