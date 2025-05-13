#!/bin/bash

# Usage function
usage() {
  echo "Usage: $0 <material-name> [--use-ogl]"
  exit 1
}

# Validate arguments
if [ -z "$1" ]; then
  usage
fi

MATERIAL_NAME="$1"
USE_OGL=false

if [ "$2" == "--use-ogl" ]; then
  USE_OGL=true
fi

SRC_DIR="/Users/martinscotte/Downloads/$MATERIAL_NAME"
DEST_DIR="/Users/martinscotte/code/clearview/public/assets/materials/terrain/$MATERIAL_NAME"

# Output files
OUT_NORMALHEIGHT="$DEST_DIR/normalHeight.png"
OUT_METALROUGH="$DEST_DIR/metalRough.png"
OUT_ALBEDO="$DEST_DIR/albedo.png"
OUT_AO="$DEST_DIR/ao.png"

# Input files
NORMAL_OGL="$SRC_DIR/${MATERIAL_NAME}_normal-ogl.png"
HEIGHT="$SRC_DIR/${MATERIAL_NAME}_height.png"
METALLIC="$SRC_DIR/${MATERIAL_NAME}_metallic.png"
ROUGHNESS="$SRC_DIR/${MATERIAL_NAME}_roughness.png"
ALBEDO_SRC="$SRC_DIR/${MATERIAL_NAME}_albedo.png"
AO_SRC="$SRC_DIR/${MATERIAL_NAME}_ao.png"

# Temp files
TEMP_NORMAL="$DEST_DIR/_temp_normal.png"
TEMP_HEIGHT_GRAY="$DEST_DIR/_temp_height_gray.png"
TEMP_METAL_GRAY="$DEST_DIR/_temp_metallic_gray.png"
TEMP_ROUGH_GRAY="$DEST_DIR/_temp_roughness_gray.png"

# Create destination folder if it doesn't exist
mkdir -p "$DEST_DIR"

# ==== Validate required input files ====
REQUIRED_FILES=("$NORMAL_OGL" "$HEIGHT" "$METALLIC" "$ROUGHNESS" "$ALBEDO_SRC" "$AO_SRC")
for FILE in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "❌ Missing file: $FILE"
    exit 1
  fi
done

echo "🔄 Processing material: $MATERIAL_NAME"
echo "🌐 Normal map mode: $([ "$USE_OGL" = true ] && echo "OpenGL" || echo "DirectX")"

# ==== Step 1: Use normal map (flip green unless OGL mode is on) ====
if [ "$USE_OGL" = true ]; then
  cp "$NORMAL_OGL" "$TEMP_NORMAL"
else
  magick "$NORMAL_OGL" -channel G -negate +channel "$TEMP_NORMAL"
fi

# ==== Step 2: Grayscale height map ====
magick "$HEIGHT" -colorspace Gray -depth 8 "$TEMP_HEIGHT_GRAY"

# ==== Step 3: Combine normal RGB + height A => normalHeight.png ====
magick "$TEMP_NORMAL" "$TEMP_HEIGHT_GRAY" \
  -alpha off -compose CopyOpacity -composite \
  "$OUT_NORMALHEIGHT"
echo "✅ normalHeight.png created"

# ==== Step 4: Prepare metal and rough maps ====
magick "$METALLIC" -colorspace Gray "$TEMP_METAL_GRAY"
magick "$ROUGHNESS" -colorspace Gray "$TEMP_ROUGH_GRAY"

# ==== Step 5: Compose metalRough.png ====
magick "$TEMP_METAL_GRAY" "$TEMP_ROUGH_GRAY" \
  -channel R -combine \
  "$TEMP_ROUGH_GRAY" -channel G -combine \
  xc:black -channel B -combine \
  "$TEMP_ROUGH_GRAY" -alpha off -compose CopyOpacity -composite \
  "$OUT_METALROUGH"
echo "✅ metalRough.png created"

# ==== Step 6: Copy albedo and ao with standardized names ====
cp "$ALBEDO_SRC" "$OUT_ALBEDO" && echo "✅ albedo.png copied"
cp "$AO_SRC" "$OUT_AO" && echo "✅ ao.png copied"

# ==== Cleanup ====
rm "$TEMP_NORMAL" "$TEMP_HEIGHT_GRAY" "$TEMP_METAL_GRAY" "$TEMP_ROUGH_GRAY"

echo "🎉 All files processed successfully into: $DEST_DIR"
