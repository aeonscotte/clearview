#!/bin/bash

# Usage function
usage() {
  echo "Usage: $0 <material-name>"
  exit 1
}

# Validate arguments
if [ -z "$1" ]; then
  usage
fi

MATERIAL_NAME="$1"

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
TEMP_NORMAL_ROTATED="$DEST_DIR/_temp_normal_rotated.png"
TEMP_HEIGHT="$DEST_DIR/_temp_height.png"
TEMP_HEIGHT_GRAY="$DEST_DIR/_temp_height_gray.png"
TEMP_METALLIC="$DEST_DIR/_temp_metallic.png"
TEMP_METAL_GRAY="$DEST_DIR/_temp_metallic_gray.png"
TEMP_ROUGHNESS="$DEST_DIR/_temp_roughness.png"
TEMP_ROUGH_GRAY="$DEST_DIR/_temp_roughness_gray.png"
TEMP_ALBEDO_ROTATED="$DEST_DIR/_temp_albedo_rotated.png"
TEMP_AO_ROTATED="$DEST_DIR/_temp_ao_rotated.png"

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
echo "🌐 Rotating all textures 180° for consistent alignment"

# ==== Step 1: Rotate ALL textures by 180 degrees ====
# Normal map
cp "$NORMAL_OGL" "$TEMP_NORMAL"
magick "$TEMP_NORMAL" -rotate 180 "$TEMP_NORMAL_ROTATED"

# Height map
cp "$HEIGHT" "$TEMP_HEIGHT"
magick "$TEMP_HEIGHT" -rotate 180 -colorspace Gray -depth 8 "$TEMP_HEIGHT_GRAY"

# Metallic map
cp "$METALLIC" "$TEMP_METALLIC"
magick "$TEMP_METALLIC" -rotate 180 -colorspace Gray "$TEMP_METAL_GRAY"

# Roughness map
cp "$ROUGHNESS" "$TEMP_ROUGHNESS"
magick "$TEMP_ROUGHNESS" -rotate 180 -colorspace Gray "$TEMP_ROUGH_GRAY"

# Albedo and AO maps
magick "$ALBEDO_SRC" -rotate 180 "$TEMP_ALBEDO_ROTATED"
magick "$AO_SRC" -rotate 180 "$TEMP_AO_ROTATED"

echo "✅ All textures rotated 180° for consistent alignment"

# ==== Step 2: Combine normal RGB + height A => normalHeight.png ====
magick "$TEMP_NORMAL_ROTATED" "$TEMP_HEIGHT_GRAY" \
  -alpha off -compose CopyOpacity -composite \
  "$OUT_NORMALHEIGHT"
echo "✅ normalHeight.png created with rotated normal and height maps"

# ==== Step 3: Compose metalRough.png ====
magick "$TEMP_METAL_GRAY" "$TEMP_ROUGH_GRAY" \
  -channel R -combine \
  "$TEMP_ROUGH_GRAY" -channel G -combine \
  xc:black -channel B -combine \
  "$TEMP_ROUGH_GRAY" -alpha off -compose CopyOpacity -composite \
  "$OUT_METALROUGH"
echo "✅ metalRough.png created with rotated metal and roughness maps"

# ==== Step 4: Save rotated albedo and AO maps ====
cp "$TEMP_ALBEDO_ROTATED" "$OUT_ALBEDO" && echo "✅ Rotated albedo.png saved"
cp "$TEMP_AO_ROTATED" "$OUT_AO" && echo "✅ Rotated ao.png saved"

# ==== Cleanup ====
rm "$TEMP_NORMAL" "$TEMP_NORMAL_ROTATED" "$TEMP_HEIGHT" "$TEMP_HEIGHT_GRAY" 
rm "$TEMP_METALLIC" "$TEMP_METAL_GRAY" "$TEMP_ROUGHNESS" "$TEMP_ROUGH_GRAY" 
rm "$TEMP_ALBEDO_ROTATED" "$TEMP_AO_ROTATED"

echo "🎉 All textures processed and consistently rotated by 180°"