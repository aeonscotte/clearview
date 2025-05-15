#!/bin/zsh

# Script to copy Clearview project files to a desktop folder named 'claude' (flat structure)

# Create the destination directory if it doesn't exist
DEST_DIR="$HOME/Desktop/claude"
mkdir -p "$DEST_DIR"
echo "Created destination directory: $DEST_DIR"

# Copy files to flat structure
cp src/app/engine/core/engine.service.ts "$DEST_DIR/"
cp src/app/engine/core/scene-manager.service.ts "$DEST_DIR/"
cp src/app/engine/base/scene.ts "$DEST_DIR/"
cp src/app/engine/physics/time.service.ts "$DEST_DIR/"
cp src/app/engine/physics/time-state.model.ts "$DEST_DIR/"
cp src/app/engine/world/atmosphere.service.ts "$DEST_DIR/"
cp src/app/engine/world/celestial.service.ts "$DEST_DIR/"
cp src/app/engine/world/light.service.ts "$DEST_DIR/"
cp src/app/engine/world/sky.service.ts "$DEST_DIR/"
cp src/app/engine/world/terrain.service.ts "$DEST_DIR/"
cp src/app/engine/player/camera.service.ts "$DEST_DIR/"
cp src/app/engine/material/material.service.ts "$DEST_DIR/"
cp src/app/engine/shaders/enhancedSky.vertex.ts "$DEST_DIR/"
cp src/app/engine/shaders/enhancedSky.fragment.ts "$DEST_DIR/"
cp src/app/engine/shaders/shader-registry.service.ts "$DEST_DIR/"
cp src/app/engine/scenes/scene001.scene.ts "$DEST_DIR/"
cp src/app/components/clearview/viewport/viewport.component.ts "$DEST_DIR/"
cp src/app/app.config.ts "$DEST_DIR/"
cp src/styles.less "$DEST_DIR/"
cp README.md "$DEST_DIR/"

echo "All files successfully copied to $DEST_DIR"