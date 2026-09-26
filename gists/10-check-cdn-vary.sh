#!/usr/bin/env bash
# Check that your CDN keys its cache on Available-Dictionary.
# If the second request comes back as dcz, the CDN is serving a dictionary-
# compressed body to a client that never offered a dictionary. Fix before launch.
URL="$1"   # e.g. https://example.com/assets/app-33b06492.js
DICT="$2"  # e.g. :KOO9gM5DYecTBsQz+4hcBOx265lrTeiJ2QErS5Y/pwA=:

echo "With dictionary:"
curl -s -o /dev/null -D - -H "Accept-Encoding: br, dcz" -H "Available-Dictionary: $DICT" "$URL" \
  | grep -iE "^(content-encoding|vary|age|x-cache|cf-cache-status):"

echo "Without dictionary (must not be dcz):"
curl -s -o /dev/null -D - -H "Accept-Encoding: br, dcz" "$URL" \
  | grep -iE "^(content-encoding|vary|age|x-cache|cf-cache-status):"
