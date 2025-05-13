// src/app/engine/world/sky.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder, ShaderMaterial, Vector3, Mesh, Effect, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { WeatherService } from './weather.service';
import { CelestialService } from './celestial.service';

@Injectable({
  providedIn: 'root'
})
export class SkyService {
    private skyDome: Mesh | null = null;
    private skyMaterial: ShaderMaterial | null = null;
    private cloudiness: number = 0.0;
    private targetCloudiness: number = 0.0;
    private cloudTransitionSpeed: number = 0.002;

    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService,
        private weatherService?: WeatherService
    ) {}

    createSky(scene: Scene): void {
        this.registerShaders();

        // Create a complete spherical dome with higher quality for smoother appearance
        this.skyDome = MeshBuilder.CreateSphere('skyDome', {
            diameter: 1000,
            segments: 48, // Higher segment count for better quality
            sideOrientation: Mesh.BACKSIDE // Render inside of sphere
        }, scene);

        // Critical rendering properties
        this.skyDome.infiniteDistance = true; // Never moves with camera
        this.skyDome.renderingGroupId = 0; // Render first, behind everything
        this.skyDome.isPickable = false; // Can't be interacted with
        this.skyDome.freezeWorldMatrix(); // Performance optimization

        // Create the shader material
        this.skyMaterial = new ShaderMaterial("skyShader", scene, {
            vertex: "enhancedSky",
            fragment: "enhancedSky"
        }, {
            attributes: ["position", "normal"],
            uniforms: ["worldViewProjection", "sunPosition", "moonPosition", "iTime", "cloudiness"]
        });

        // Make sure the material can be seen from inside the sphere
        this.skyMaterial.backFaceCulling = false;
        
        // Set initial values
        const { sunDir, moonDir } = this.celestialService.getCelestialPositions();
        this.skyMaterial.setVector3("sunPosition", sunDir);
        this.skyMaterial.setVector3("moonPosition", moonDir);
        this.skyMaterial.setFloat("iTime", this.timeService.getWorldTime());
        this.skyMaterial.setFloat("cloudiness", 0.0);
        
        this.skyDome.material = this.skyMaterial;
    }

    update(): void {
        if (!this.skyMaterial) {
            console.warn("Sky material not initialized");
            return;
        }
        
        // Get the current celestial positions
        const { sunDir, moonDir } = this.celestialService.getCelestialPositions();
        const worldTime = this.timeService.getWorldTime();
        
        // Update sun/moon positions - these are the key synchronization points
        this.skyMaterial.setVector3("sunPosition", sunDir);
        this.skyMaterial.setVector3("moonPosition", moonDir);
        this.skyMaterial.setFloat("iTime", worldTime);
        
        // Update cloudiness based on weather
        if (this.weatherService) {
            const weatherStatus = this.weatherService.getWeatherStatus();
            
            switch (weatherStatus.type) {
                case 'clear':
                    this.targetCloudiness = 0.0;
                    break;
                case 'fog':
                    this.targetCloudiness = 0.6 * weatherStatus.intensity;
                    break;
                case 'rain':
                    this.targetCloudiness = 0.8 * weatherStatus.intensity;
                    break;
                case 'snow':
                    this.targetCloudiness = 0.7 * weatherStatus.intensity;
                    break;
                case 'overcast':
                    this.targetCloudiness = 0.9 * weatherStatus.intensity;
                    break;
                default:
                    this.targetCloudiness = 0.0;
            }
        }
        
        // Smooth cloudiness transition
        if (this.cloudiness < this.targetCloudiness) {
            this.cloudiness = Math.min(this.targetCloudiness, this.cloudiness + this.cloudTransitionSpeed);
        } else if (this.cloudiness > this.targetCloudiness) {
            this.cloudiness = Math.max(this.targetCloudiness, this.cloudiness - this.cloudTransitionSpeed);
        }
        
        // Update shader uniforms
        this.skyMaterial.setFloat("cloudiness", this.cloudiness);
    }

    setCloudiness(value: number): void {
        this.targetCloudiness = Math.max(0, Math.min(1, value));
    }

    private registerShaders(): void {
        Effect.ShadersStore["enhancedSkyVertexShader"] = `
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

        Effect.ShadersStore["enhancedSkyFragmentShader"] = `
            precision highp float;
            uniform vec3 sunPosition;   // Sun direction vector
            uniform vec3 moonPosition;  // Moon direction vector
            uniform float iTime;        // World time in hours (0-24)
            uniform float cloudiness;   // Cloud coverage (0-1)
            varying vec3 vPosition;
            varying vec3 vNormal;

            // Simple hash function for minimal star twinkling
            float hash(vec3 p) {
                p = fract(p * vec3(123.34, 234.34, 345.65));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y * p.z);
            }
    
            // Very minimal star effect - just enough to be visible at night
            vec3 stars(vec3 dir, float time) {
                // Rotate stars slowly with time
                float angle = time * 0.1;
                float c = cos(angle);
                float s = sin(angle);
                vec3 rotatedDir = vec3(
                    dir.x * c - dir.z * s,
                    dir.y,
                    dir.x * s + dir.z * c
                );
        
                // Create sparse star field
                float size = 200.0;
                vec3 pos = rotatedDir * size;
                vec3 grid = floor(pos);
        
                // Only some grid cells have stars
                float cell = hash(grid);
                if (cell > 0.99) { // Very sparse - only 1% of cells have stars
                    // Subtle twinkling
                    float brightness = fract(cell * 12345.67890 + time * 0.5);
                    brightness = pow(brightness, 10.0) * 0.8;
            
                    // Star color - mostly white with slight blue tint
                    return vec3(0.8, 0.9, 1.0) * brightness;
                }
        
                return vec3(0.0);
            }
    
            void main(void) {
                // Get view direction
                vec3 dir = normalize(vPosition);

                // Sun and moon specifics
                float sunDot = max(dot(dir, sunPosition), 0.0);
                float moonDot = max(dot(dir, moonPosition), 0.0);
                float sunHeight = sunPosition.y;  // -1 to 1

                // Time of day factors
                float dayFactor = smoothstep(-0.05, 0.1, sunHeight);
                float nightFactor = smoothstep(0.1, -0.05, sunHeight);
                float dawnFactor = smoothstep(-0.15, -0.05, sunHeight) * smoothstep(0.15, 0.0, sunHeight);
                float duskFactor = smoothstep(0.15, 0.0, sunHeight) * smoothstep(-0.15, -0.05, sunHeight);

                // Height factor (horizon to zenith)
                float t = max(0.0, dir.y); // 0 at horizon, 1 at zenith

                // Sky colors - simple gradients
                vec3 zenithDayColor = vec3(0.2, 0.4, 0.8);      // Deep blue
                vec3 horizonDayColor = vec3(0.7, 0.8, 1.0);     // Light blue

                vec3 zenithNightColor = vec3(0.02, 0.02, 0.05); // Almost black
                vec3 horizonNightColor = vec3(0.05, 0.05, 0.1); // Deep blue

                vec3 zenithDawnColor = vec3(0.2, 0.2, 0.5);     // Deep purple-blue
                vec3 horizonDawnColor = vec3(0.9, 0.6, 0.5);    // Orange-pink

                vec3 zenithDuskColor = vec3(0.2, 0.2, 0.4);     // Deep purple-blue
                vec3 horizonDuskColor = vec3(0.8, 0.5, 0.4);    // Orange-red

                // Blend zenith and horizon colors based on view elevation
                vec3 dayColor = mix(horizonDayColor, zenithDayColor, t);
                vec3 nightColor = mix(horizonNightColor, zenithNightColor, t);
                vec3 dawnColor = mix(horizonDawnColor, zenithDawnColor, t);
                vec3 duskColor = mix(horizonDuskColor, zenithDuskColor, t);

                // Get stars, visible at night (very minimal)
                vec3 starField = vec3(0.0);
                if (nightFactor > 0.5 && dir.y > 0.0) {
                    starField = stars(dir, iTime) * nightFactor;
                }

                // Blend sky colors based on time of day
                vec3 skyColor = 
                    dayColor * dayFactor + 
                    (nightColor + starField) * nightFactor + 
                    dawnColor * dawnFactor + 
                    duskColor * duskFactor;

                // Small, realistic sun
                float sunSize = 0.005; // Smaller sun
                float sunDisc = smoothstep(0.9995 - sunSize, 0.9999, sunDot);
                float sunGlow = pow(sunDot, 64.0) * (1.0 - nightFactor); // Sharper, smaller glow

                // Sun colors based on height
                vec3 sunColor = mix(
                    vec3(1.0, 0.5, 0.2),  // Sunset orange
                    vec3(1.0, 0.95, 0.8), // Midday white-yellow
                    smoothstep(0.0, 0.5, sunHeight)
                );

                // Add sun only when above/near horizon
                if (sunHeight > -0.1) {
                    skyColor += sunColor * sunDisc * (1.0 - nightFactor * 0.95);
                    skyColor += sunColor * 0.3 * sunGlow; // Less intense glow
                }

                // Small, realistic moon
                float moonSize = 0.005; // Smaller moon
                float moonDisc = smoothstep(0.9996 - moonSize, 0.9999, moonDot);
                float moonGlow = pow(moonDot, 64.0) * nightFactor; // Sharper, smaller glow

                // Add moon only when above horizon
                if (moonPosition.y > -0.1) {
                    // Simple light gray moon with subtle blue tint
                    vec3 moonColor = vec3(0.9, 0.9, 0.95);
                    skyColor += moonColor * moonDisc * nightFactor;
                    skyColor += vec3(0.6, 0.7, 0.9) * moonGlow * 0.1; // Very subtle glow
                }

                // Apply clouds when enabled (simple, minimal)
                if (cloudiness > 0.0 && dir.y > 0.0) {
                    // Very basic cloud pattern
                    vec2 cloudPos = dir.xz / (dir.y + 0.1);
                    float cloudPattern = sin(cloudPos.x * 2.0 + iTime * 0.02) * 
                                        sin(cloudPos.y * 2.0 + iTime * 0.01) * 0.5 + 0.5;

                    // Apply cloudiness threshold
                    float clouds = smoothstep(1.0 - cloudiness * 0.8, 1.0, cloudPattern);

                    // Cloud color based on time of day
                    vec3 cloudDay = vec3(1.0);
                    vec3 cloudNight = vec3(0.2, 0.2, 0.3);
                    vec3 cloudDawn = vec3(0.9, 0.7, 0.5);
                    vec3 cloudDusk = vec3(0.8, 0.6, 0.4);

                    vec3 cloudColor = 
                        cloudDay * dayFactor + 
                        cloudNight * nightFactor + 
                        cloudDawn * dawnFactor + 
                        cloudDusk * duskFactor;

                    // Blend clouds with sky
                    skyColor = mix(skyColor, cloudColor, clouds * cloudiness);
                }

                gl_FragColor = vec4(skyColor, 1.0);
            }
        `;;
    }
}