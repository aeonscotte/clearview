export const fragmentShader = `
precision highp float;
varying vec2 vUV;
varying float vWave;
uniform vec3 waterColor;
uniform vec3 foamColor;
uniform float foamThreshold;
uniform float lod;
void main() {
    float foam = smoothstep(foamThreshold - 0.01, foamThreshold + 0.01, abs(vWave));
    vec3 color = mix(waterColor, foamColor, foam * (1.0 - lod));
    gl_FragColor = vec4(color, 1.0);
}`;
