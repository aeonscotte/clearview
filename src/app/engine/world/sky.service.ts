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
            
            // Improved hash function
            float hash(vec3 p) {
                p = fract(p * vec3(443.8975, 397.2973, 491.1871));
                p += dot(p, p + 19.19);
                return fract(p.x * p.y * p.z);
            }
            
            // Higher quality noise function
            float noise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                
                // Smoother interpolation
                f = f * f * (3.0 - 2.0 * f);
                
                // Mix 8 corners
                float n = mix(
                    mix(
                        mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x),
                        f.y
                    ),
                    mix(
                        mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x),
                        f.y
                    ),
                    f.z
                );
                
                return n;
            }
            
            // Improved star field with more subtle twinkling
            vec3 stars(vec3 dir, float time) {
                vec3 starColor = vec3(0.0);
                
                // Rotate stars slowly with Earth's rotation
                float angle = time * 0.1;
                float c = cos(angle);
                float s = sin(angle);
                vec3 rotatedDir = vec3(
                    dir.x * c - dir.z * s,
                    dir.y,
                    dir.x * s + dir.z * c
                );
                
                // Stars with varying size and brightness
                for (int i = 0; i < 3; i++) { // Three layers of stars
                    float scale = 200.0 + float(i) * 150.0; // Different scales
                    vec3 pos = rotatedDir * scale;
                    vec3 grid = floor(pos);
                    
                    // Determine if this cell has a star
                    float starPresence = hash(grid);
                    
                    // Create stars with different density per layer
                    float brightnessThreshold = 0.97 + float(i) * 0.01; // Different thresholds
                    
                    if (starPresence > brightnessThreshold) {
                        // Star properties
                        float starBrightness = (starPresence - brightnessThreshold) / (1.0 - brightnessThreshold);
                        starBrightness = pow(starBrightness, 1.5); // Adjust brightness curve
                        
                        // Subtle twinkling - never goes completely off
                        float baseLevel = 0.7 + 0.2 * float(i); // Stars don't disappear completely
                        float twinkleSpeed = 3.0 + hash(grid) * 7.0; // Varied speeds
                        float twinkling = baseLevel + (1.0 - baseLevel) * sin(time * twinkleSpeed + starPresence * 20.0) * 0.5 + 0.5;
                        
                        // Star color - slight variation based on temperature (bluer/redder)
                        float temperature = hash(grid + vec3(123.456, 789.012, 345.678));
                        vec3 colorTint = mix(
                            vec3(1.0, 0.7, 0.5), // Reddish stars
                            vec3(0.7, 0.8, 1.0),  // Blueish stars
                            temperature
                        );
                        
                        // Size falloff to avoid pixelated appearance
                        vec3 starOffset = fract(pos) - 0.5;
                        float distToCenter = length(starOffset) * 2.0;
                        float falloff = 1.0 - smoothstep(0.0, 0.8, distToCenter);
                        
                        // Add this star to the total
                        starColor += colorTint * starBrightness * twinkling * falloff * (0.5 - float(i) * 0.15);
                    }
                }
                
                return starColor;
            }
            
            // Rayleigh scattering approximation
            vec3 rayleighScattering(float sunCosTheta, float height) {
                // Simplification of atmospheric scattering
                // This simulates the blue sky caused by Rayleigh scattering
                vec3 rayleighCoeff = vec3(5.8, 13.5, 33.1) * 0.000001; // RGB coefficients
                float rayleighDepth = 1.0 / (height * 0.1 + 0.1); // More scattering near horizon
                
                return rayleighCoeff * rayleighDepth * (1.0 + sunCosTheta * sunCosTheta);
            }
            
            void main(void) {
                // Get view direction
                vec3 dir = normalize(vPosition);
            
                // Sun and moon specifics
                float sunDot = max(dot(dir, sunPosition), 0.0);
                float moonDot = max(dot(dir, moonPosition), 0.0);
                float sunHeight = sunPosition.y;  // -1 to 1
                
                // Time of day transitions - smoother blending
                // Use smoothstep with tighter transition periods
                float dayFactor = smoothstep(-0.025, 0.15, sunHeight);
                float nightFactor = smoothstep(0.15, -0.025, sunHeight);
                
                // Dawn/dusk factors - peak exactly at sunrise/sunset
                float dawnFactor = smoothstep(-0.2, -0.025, sunHeight) * smoothstep(0.15, -0.025, sunHeight);
                float duskFactor = smoothstep(0.15, -0.025, sunHeight) * smoothstep(-0.2, -0.025, sunHeight);
                
                // Normalized view direction height (0 at horizon, 1 at zenith)
                float viewHeight = max(0.0, dir.y);
                
                // Sky gradient height factor
                float t = smoothstep(0.0, 0.4, viewHeight); // Smoother transition near horizon
                
                // Generate physically-based sky colors
                // Deep blue zenith to pale blue horizon during day
                vec3 zenithDayColor = vec3(0.18, 0.26, 0.48); // Deeper blue 
                vec3 horizonDayColor = vec3(0.7, 0.8, 0.95);  // Pale blue-white
                
                // Deep navy zenith to dark blue horizon at night
                vec3 zenithNightColor = vec3(0.015, 0.015, 0.04); // Almost black with hint of blue
                vec3 horizonNightColor = vec3(0.04, 0.04, 0.08);  // Very dark blue
                
                // Sunrise colors - deep blue to orange-pink
                vec3 zenithDawnColor = vec3(0.1, 0.15, 0.3);    // Deep blue with purple tint
                vec3 horizonDawnColor = vec3(0.9, 0.6, 0.35);   // Orange-pink-gold
                
                // Sunset colors - similar to dawn but deeper reds
                vec3 zenithDuskColor = vec3(0.1, 0.15, 0.25);   // Deep blue-purple
                vec3 horizonDuskColor = vec3(0.8, 0.35, 0.15);  // Deep red-orange
                
                // The height at which to blend colors changes based on time of day
                // During sunrise/sunset, extend the horizon colors higher
                float blendHeightDay = t;
                float blendHeightDawn = mix(t, smoothstep(0.0, 0.8, viewHeight), 0.7);
                float blendHeightDusk = mix(t, smoothstep(0.0, 0.8, viewHeight), 0.7);
                float blendHeightNight = t;
                
                // Blend zenith and horizon colors with appropriate height factors
                vec3 dayColor = mix(horizonDayColor, zenithDayColor, blendHeightDay);
                vec3 nightColor = mix(horizonNightColor, zenithNightColor, blendHeightNight);
                vec3 dawnColor = mix(horizonDawnColor, zenithDawnColor, blendHeightDawn);
                vec3 duskColor = mix(horizonDuskColor, zenithDuskColor, blendHeightDusk);
                
                // Get stars, visible at night with more realistic twinkling
                vec3 starField = vec3(0.0);
                if (nightFactor > 0.0 && dir.y > 0.0) {
                    // Stars appear gradually as it gets darker
                    starField = stars(dir, iTime) * smoothstep(0.0, 0.5, nightFactor);
                }
                
                // Blend sky colors based on time of day - ensure smooth transitions
                vec3 skyColor = mix(
                    mix(
                        mix(nightColor, dawnColor, dawnFactor),
                        dayColor, 
                        dayFactor
                    ),
                    duskColor,
                    duskFactor
                );
                
                // Add stars to night sky
                skyColor += starField;
                
                // Much smaller, realistic sun
                float sunSize = 0.002; // Significantly smaller sun
                float sunDisc = smoothstep(0.9998 - sunSize, 0.9999, sunDot);
                
                // Sun glow should be larger than the sun itself, but still fairly concentrated
                float sunGlow = pow(sunDot, 150.0) * (1.0 - nightFactor); // Sharper falloff for more concentrated glow
                float sunOuterGlow = pow(sunDot, 20.0) * (1.0 - nightFactor) * 0.2; // Wider, subtle outer glow
                
                // Sun colors based on height - correct subtle transitions
                vec3 sunColor = mix(
                    vec3(1.0, 0.3, 0.0),  // Low sun (deep orange)
                    mix(
                        vec3(1.0, 0.6, 0.0),  // Rising sun (orange-yellow)
                        vec3(1.0, 0.95, 0.8), // High sun (bright white-yellow)
                        smoothstep(0.1, 0.5, sunHeight)
                    ),
                    smoothstep(-0.025, 0.1, sunHeight)
                );
                
                // Add sun only when above/near horizon
                if (sunHeight > -0.1) {
                    // Sun disc with gradual intensity based on height
                    skyColor += sunColor * sunDisc * mix(0.5, 1.0, smoothstep(-0.1, 0.2, sunHeight));
                    
                    // Inner glow
                    skyColor += sunColor * sunGlow;
                    
                    // Outer glow - less intense
                    skyColor += mix(sunColor, vec3(1.0), 0.5) * sunOuterGlow;
                }
                
                // Smaller, realistic moon
                float moonSize = 0.0015; // Smaller moon
                float moonDisc = smoothstep(0.9998 - moonSize, 0.9999, moonDot);
                
                // Moon glow should be more subtle than sun
                float moonGlow = pow(moonDot, 200.0) * nightFactor * 0.5;
                float moonOuterGlow = pow(moonDot, 30.0) * nightFactor * 0.1;
                
                // Add moon only when above horizon
                if (moonPosition.y > -0.1) {
                    // Light gray moon with subtle blue tint
                    vec3 moonColor = vec3(0.9, 0.9, 0.95);
                    
                    // Moon disc
                    skyColor += moonColor * moonDisc * nightFactor;
                    
                    // Moon glow - very subtle
                    skyColor += vec3(0.6, 0.7, 0.9) * moonGlow;
                    skyColor += vec3(0.3, 0.4, 0.6) * moonOuterGlow;
                }
                
                // Apply clouds when enabled
                if (cloudiness > 0.0 && dir.y > 0.0) {
                    // Improved cloud pattern
                    vec3 cloudCoord = vec3(dir.xz / (dir.y + 0.1), iTime * 0.01);
                    float cloudBase = noise(cloudCoord * 2.0);
                    float cloudDetail = noise(cloudCoord * 8.0);
                    
                    // More natural cloud shapes
                    float cloudPattern = cloudBase * 0.7 + cloudDetail * 0.3;
                    
                    // Apply cloudiness threshold with softer edges
                    float clouds = smoothstep(1.0 - cloudiness * 0.8, 1.0 - cloudiness * 0.4, cloudPattern);
                    
                    // Cloud color based on time of day - physical light scattering
                    vec3 cloudSunlight = mix(
                        vec3(0.8, 0.3, 0.0), // Sunset/sunrise
                        vec3(1.0, 1.0, 1.0), // Daytime
                        smoothstep(-0.1, 0.3, sunHeight)
                    );
                    
                    vec3 cloudAmbient = mix(
                        vec3(0.1, 0.1, 0.2), // Night ambient
                        vec3(0.5, 0.5, 0.6), // Day ambient
                        smoothstep(-0.1, 0.1, sunHeight)
                    );
                    
                    // Calculate light arriving at cloud
                    float sunContribution = max(0.0, dot(vec3(0.0, 1.0, 0.0), sunPosition)) * 0.5 + 0.5;
                    vec3 cloudIllumination = mix(cloudAmbient, cloudSunlight, sunContribution);
                    
                    // Final cloud color combines illumination with scattering
                    vec3 cloudColor = mix(
                        cloudIllumination * 0.3, // Darker base
                        cloudIllumination,        // Brighter lit parts
                        clouds * 0.7 + 0.3        // Vary by cloud density
                    );
                    
                    // Blend clouds with sky
                    skyColor = mix(skyColor, cloudColor, clouds * cloudiness);
                }
                
                // Tonemap the final color for better dynamic range
                skyColor = skyColor / (skyColor + vec3(1.0)); // Simple Reinhard tonemap
                
                // Apply a subtle gamma correction for more accurate colors
                skyColor = pow(skyColor, vec3(0.9));
            
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `;
    }
}