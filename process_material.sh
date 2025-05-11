#!/bin/bash

# Usage check
if [ -z "$1" ]; then
  echo "Usage: $0 <material-name>"
  exit 1
fi

MATERIAL_NAME="$1"
SRC_DIR="/Users/martinscotte/Downloads/$MATERIAL_NAME"
DEST_DIR="/Users/martinscotte/code/clearview/public/assets/materials/terrain/$MATERIAL_NAME"

# Output files
OUT_NORMALHEIGHT="$DEST_DIR/normalHeight.png"
OUT_METALROUGH="$DEST_DIR/metalRough.png"

# Input files
NORMAL_OGL="$SRC_DIR/${MATERIAL_NAME}_normal-ogl.png"
HEIGHT="$SRC_DIR/${MATERIAL_NAME}_height.png"
METALLIC="$SRC_DIR/${MATERIAL_NAME}_metallic.png"
ROUGHNESS="$SRC_DIR/${MATERIAL_NAME}_roughness.png"

# Temp files
TEMP_NORMAL_DX="$DEST_DIR/_temp_normal_dx.png"
TEMP_HEIGHT_GRAY="$DEST_DIR/_temp_height_gray.png"
TEMP_METAL_GRAY="$DEST_DIR/_temp_metallic_gray.png"
TEMP_ROUGH_GRAY="$DEST_DIR/_temp_roughness_gray.png"

# Create destination if it doesn't exist
mkdir -p "$DEST_DIR"

# ==== Validate input files ====
for FILE in "$NORMAL_OGL" "$HEIGHT" "$METALLIC" "$ROUGHNESS"; do
  if [ ! -f "$FILE" ]; then
    echo "❌ Missing file: $FILE"
    exit 1
  fi
done

echo "🔄 Processing: $MATERIAL_NAME"

# ==== Step 1: Flip green channel (OpenGL ➜ DirectX) ====
convert "$NORMAL_OGL" -channel G -negate +channel "$TEMP_NORMAL_DX"

# ==== Step 2: Convert height to grayscale ====
convert "$HEIGHT" -colorspace Gray -depth 8 "$TEMP_HEIGHT_GRAY"

# ==== Step 3: Combine normal RGB + height alpha => normalHeight.png ====
convert "$TEMP_NORMAL_DX" "$TEMP_HEIGHT_GRAY" \
  -alpha off -compose CopyOpacity -composite \
  "$OUT_NORMALHEIGHT"
echo "✅ Created: $OUT_NORMALHEIGHT"

# ==== Step 4: Prepare metallic and roughness ====
convert "$METALLIC" -colorspace Gray "$TEMP_METAL_GRAY"
convert "$ROUGHNESS" -colorspace Gray "$TEMP_ROUGH_GRAY"

# ==== Step 5: Combine metallic R, roughness G, B unused, A = roughness ====
convert "$TEMP_METAL_GRAY" "$TEMP_ROUGH_GRAY" \
  -channel R -combine \
  "$TEMP_ROUGH_GRAY" -channel G -combine \
  xc:black -channel B -combine \
  "$TEMP_ROUGH_GRAY" -alpha off -compose CopyOpacity -composite \
  "$OUT_METALROUGH"

echo "✅ Created: $OUT_METALROUGH (with alpha = roughness)"

# ==== Cleanup ====
rm "$TEMP_NORMAL_DX" "$TEMP_HEIGHT_GRAY" "$TEMP_METAL_GRAY" "$TEMP_ROUGH_GRAY"

echo "🎉 Done."