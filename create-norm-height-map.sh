#!/bin/bash

# Set input paths
DIR="public/assets/materials/terrain/rocky-rugged-terrain"
NORMAL="$DIR/normal-dx.png"
HEIGHT="$DIR/height.png"
OUTPUT="$DIR/normalHeight.png"

# Check files exist
if [[ ! -f "$NORMAL" ]]; then
  echo "❌ Normal map not found: $NORMAL"
  exit 1
fi
if [[ ! -f "$HEIGHT" ]]; then
  echo "❌ Height map not found: $HEIGHT"
  exit 1
fi

# Convert height to single-channel grayscale (if not already)
HEIGHT_GRAY="$DIR/temp_height_gray.png"
convert "$HEIGHT" -colorspace Gray -depth 8 "$HEIGHT_GRAY"

# Compose height into alpha channel of normal
convert "$NORMAL" "$HEIGHT_GRAY" \
  -alpha off -compose CopyOpacity -composite \
  "$OUTPUT"

# Clean up temp file
rm "$HEIGHT_GRAY"

# Verify output
if [[ -f "$OUTPUT" ]]; then
  echo "✅ normalHeight map created at: $OUTPUT"
else
  echo "❌ Failed to create output image."
fi
