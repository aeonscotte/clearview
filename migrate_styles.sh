#!/bin/bash

# Rename all component CSS files to LESS
find ./src -type f -name "*.css" | while read file; do
  mv "$file" "${file%.css}.less"
done

# Rename global styles.css if it exists
if [ -f "src/styles.css" ]; then
  mv src/styles.css src/styles.less
fi
