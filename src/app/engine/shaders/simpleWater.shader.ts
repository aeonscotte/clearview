export const simpleWaterVertex = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform float time;

varying vec2 vUV;

void main() {
    vUV = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 0.1 + time * 0.5) * 0.1;
    gl_Position = worldViewProjection * vec4(pos, 1.0);
}
`;

export const simpleWaterFragment = `
precision highp float;

uniform float time;
uniform vec3 waterColor;
uniform vec3 highlightColor;
uniform float opacity;

varying vec2 vUV;

void main() {
    float wave = sin(vUV.x * 20.0 + time) * 0.1 + sin(vUV.y * 15.0 + time * 1.5) * 0.1;
    float fresnel = clamp(dot(normalize(vec3(0.0, 1.0, 0.0)), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
    vec3 color = mix(waterColor, highlightColor, wave * 0.5 + fresnel * 0.5);
    gl_FragColor = vec4(color, opacity);
}
`;
