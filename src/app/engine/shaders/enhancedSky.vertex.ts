// src/app/engine/world/shaders/enhancedSky.vertex.ts
export const vertexShader = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 worldViewProjection;
varying vec3 vPosition;
varying vec3 vNormal;
void main(void) {
    vPosition = position;
    vNormal = normal;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;