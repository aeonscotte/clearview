export const vertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
uniform float time;
uniform float amplitude;
uniform float wavelength;
uniform float speed;
varying vec2 vUV;
varying float vWave;
void main() {
    vUV = uv;
    float wave = sin((position.x + position.z) / wavelength + time * speed) * amplitude;
    vWave = wave;
    vec3 pos = position;
    pos.y += wave;
    gl_Position = worldViewProjection * vec4(pos, 1.0);
}`;
