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
            
            // Improved hash function for stars and noise
            float hash(vec3 p) {
                p = fract(p * vec3(443.8975, 397.2973, 491.1871));
                p += dot(p, p + 19.19);
                return fract(p.x * p.y * p.z);
            }
            
            // Higher quality noise function for clouds
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
            
            // Realistic star field with subtle twinkling
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
            
            // Smoother step function for transitions
            float smootherstep(float edge0, float edge1, float x) {
                x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
                return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
            }
            
            // Calculate time of day factors for smooth transitions
            void getTimeFactors(float worldTime, out float nightFactor, out float dawnFactor, 
                               out float dayFactor, out float duskFactor, 
                               out float starVisibility, out float sunVisibility, out float moonOpacity) {
                // Key time points (in hours) - matching celestial.service.ts
                float midnight = 0.0;
                float dawnStart = 5.0;
                float sunrise = 6.0;
                float dawnEnd = 7.0;
                float noon = 12.0;
                float duskStart = 17.0;
                float sunset = 18.0;
                float duskEnd = 19.0;
                
                // Night factor
                nightFactor = 0.0;
                if (worldTime >= duskEnd || worldTime <= dawnStart) {
                    if (worldTime >= duskEnd) {
                        // Evening to midnight
                        nightFactor = smootherstep(duskEnd, duskEnd + 2.0, worldTime);
                    } else {
                        // Midnight to dawn start
                        nightFactor = smootherstep(dawnStart, dawnStart - 2.0, worldTime);
                    }
                }
                
                // Dawn factor
                dawnFactor = 0.0;
                if (worldTime >= dawnStart && worldTime <= dawnEnd) {
                    if (worldTime < sunrise) {
                        // Dawn Start to Sunrise (ramp up)
                        dawnFactor = smootherstep(dawnStart, sunrise, worldTime);
                    } else {
                        // Sunrise to Dawn End (ramp down)
                        dawnFactor = smootherstep(dawnEnd, sunrise, worldTime);
                    }
                }
                
                // Day factor
                dayFactor = 0.0;
                if (worldTime >= dawnEnd && worldTime <= duskStart) {
                    float dayProgress = (worldTime - dawnEnd) / (duskStart - dawnEnd);
                    
                    // Smoother transition at edges of day
                    if (dayProgress < 0.1) {
                        dayFactor = smootherstep(0.0, 0.1, dayProgress);
                    } else if (dayProgress > 0.9) {
                        dayFactor = smootherstep(1.0, 0.9, dayProgress);
                    } else {
                        dayFactor = 1.0;
                    }
                }
                
                // Dusk factor
                duskFactor = 0.0;
                if (worldTime >= duskStart && worldTime <= duskEnd) {
                    if (worldTime < sunset) {
                        // Dusk Start to Sunset (ramp up)
                        duskFactor = smootherstep(duskStart, sunset, worldTime);
                    } else {
                        // Sunset to Dusk End (ramp down)
                        duskFactor = smootherstep(duskEnd, sunset, worldTime);
                    }
                }
                
                // Normalize factors
                float totalFactor = nightFactor + dawnFactor + dayFactor + duskFactor;
                if (totalFactor > 0.001) {
                    nightFactor /= totalFactor;
                    dawnFactor /= totalFactor;
                    dayFactor /= totalFactor;
                    duskFactor /= totalFactor;
                } else {
                    // Fallback
                    dayFactor = 1.0;
                }
                
                // Sun visibility
                sunVisibility = 0.0;
                if (worldTime >= sunrise && worldTime <= sunset) {
                    sunVisibility = 1.0;
                }
                
                // Moon visibility/opacity
                moonOpacity = 0.0;
                if (worldTime >= sunset && worldTime <= duskEnd) {
                    // Sunset to dusk end: fade in
                    moonOpacity = smootherstep(sunset, duskEnd, worldTime);
                } else if (worldTime >= duskEnd || worldTime <= dawnStart) {
                    // Fully visible during night
                    moonOpacity = 1.0;
                } else if (worldTime >= dawnStart && worldTime <= sunrise) {
                    // Dawn start to sunrise: fade out
                    moonOpacity = smootherstep(sunrise, dawnStart, worldTime);
                }
                
                // Star visibility follows a similar pattern to moon opacity
                starVisibility = 0.0;
                if (worldTime >= duskEnd || worldTime <= dawnStart) {
                    // Fully visible during night
                    starVisibility = 1.0;
                } else if (worldTime >= sunset && worldTime <= duskEnd) {
                    // Sunset to dusk end: fade in
                    starVisibility = smootherstep(sunset, duskEnd, worldTime);
                } else if (worldTime >= dawnStart && worldTime <= sunrise) {
                    // Dawn start to sunrise: fade out
                    starVisibility = smootherstep(sunrise, dawnStart, worldTime);
                }
            }
            
            // Get scientifically accurate sky colors based on time of day
            void getSkyColors(float worldTime, float viewHeight, 
                              out vec3 zenithColor, out vec3 horizonColor) {
                // Key time points
                float midnight = 0.0;
                float dawnStart = 5.0;
                float sunrise = 6.0;
                float dawnEnd = 7.0;
                float noon = 12.0;
                float duskStart = 17.0;
                float sunset = 18.0;
                float duskEnd = 19.0;
                
                // Physically accurate sky colors based on Rayleigh scattering and solar elevation
                
                // Night colors - deep blue to dark blue
                vec3 nightZenith = vec3(0.015, 0.015, 0.04);    // Almost black with hint of blue
                vec3 nightHorizon = vec3(0.04, 0.04, 0.08);     // Deep blue
                
                // Sunrise/dawn colors - from published atmospheric science research
                vec3 sunriseZenith = vec3(0.12, 0.15, 0.32);    // Deepening blue with purple hints
                vec3 sunriseHorizon = vec3(0.92, 0.58, 0.32);   // Golden orange
                
                // Day colors - based on clear sky spectra
                vec3 dayZenith = vec3(0.18, 0.26, 0.48);        // Rich blue
                vec3 dayHorizon = vec3(0.7, 0.8, 0.95);         // Pale blue-white
                
                // Sunset/dusk colors - more reds than dawn due to atmospheric scattering
                vec3 sunsetZenith = vec3(0.15, 0.12, 0.25);     // Purple-blue
                vec3 sunsetHorizon = vec3(0.9, 0.35, 0.15);     // Deep orange-red
                
                // Initialize colors
                zenithColor = vec3(0.0);
                horizonColor = vec3(0.0);
                
                // Morning transitions (midnight through dawn to day)
                if (worldTime >= midnight && worldTime < dawnStart) {
                    // Night - steady
                    zenithColor = nightZenith;
                    horizonColor = nightHorizon;
                }
                else if (worldTime >= dawnStart && worldTime < sunrise) {
                    // Dawn start to sunrise: night → sunrise
                    float t = smootherstep(dawnStart, sunrise, worldTime);
                    zenithColor = mix(nightZenith, sunriseZenith, t);
                    horizonColor = mix(nightHorizon, sunriseHorizon, t);
                }
                else if (worldTime >= sunrise && worldTime < dawnEnd) {
                    // Sunrise to dawn end: sunrise → day
                    float t = smootherstep(sunrise, dawnEnd, worldTime);
                    zenithColor = mix(sunriseZenith, dayZenith, t);
                    horizonColor = mix(sunriseHorizon, dayHorizon, t);
                }
                else if (worldTime >= dawnEnd && worldTime < duskStart) {
                    // Full day - steady
                    zenithColor = dayZenith;
                    horizonColor = dayHorizon;
                }
                else if (worldTime >= duskStart && worldTime < sunset) {
                    // Dusk start to sunset: day → sunset
                    float t = smootherstep(duskStart, sunset, worldTime);
                    zenithColor = mix(dayZenith, sunsetZenith, t);
                    horizonColor = mix(dayHorizon, sunsetHorizon, t);
                }
                else if (worldTime >= sunset && worldTime < duskEnd) {
                    // Sunset to dusk end: sunset → night
                    float t = smootherstep(sunset, duskEnd, worldTime);
                    zenithColor = mix(sunsetZenith, nightZenith, t);
                    horizonColor = mix(sunsetHorizon, nightHorizon, t);
                }
                else {
                    // Dusk end to midnight - steady night
                    zenithColor = nightZenith;
                    horizonColor = nightHorizon;
                }
            }
            
            void main(void) {
                // Get view direction
                vec3 dir = normalize(vPosition);
                
                // Sun and moon specifics
                float sunDot = max(dot(dir, sunPosition), 0.0);
                float moonDot = max(dot(dir, moonPosition), 0.0);
                float sunHeight = sunPosition.y;  // -1 to 1
                float moonHeight = moonPosition.y;  // -1 to 1
                
                // Normalized view direction height (0 at horizon, 1 at zenith)
                float viewHeight = max(0.0, dir.y);
                
                // Calculate time factors
                float nightFactor, dawnFactor, dayFactor, duskFactor;
                float starVisibility, sunVisibility, moonOpacity;
                getTimeFactors(iTime, nightFactor, dawnFactor, dayFactor, duskFactor, 
                              starVisibility, sunVisibility, moonOpacity);
                
                // Get scientifically accurate zenith and horizon colors
                vec3 zenithColor, horizonColor;
                getSkyColors(iTime, viewHeight, zenithColor, horizonColor);
                
                // Blend between horizon and zenith based on view height
                // More gradual transition near horizon for realism
                float blendFactor;
                if (viewHeight < 0.1) {
                    // Near horizon: very gradual transition
                    blendFactor = smootherstep(0.0, 0.1, viewHeight) * 0.3; 
                } else {
                    // Higher in sky: more direct transition
                    blendFactor = 0.3 + smootherstep(0.1, 0.5, viewHeight) * 0.7;
                }
                
                // Final sky color blending zenith and horizon
                vec3 skyColor = mix(horizonColor, zenithColor, blendFactor);
                
                // Get stars - visible based on star visibility factor
                vec3 starField = vec3(0.0);
                if (starVisibility > 0.0 && viewHeight > 0.0) {
                    starField = stars(dir, iTime) * starVisibility;
                }
                
                // Add stars to night sky
                skyColor += starField;
                
                // Very small, scientifically accurate sun
                float sunSize = 0.0008; // Smaller, more realistic sun diameter
                float sunDisc = smootherstep(0.9999 - sunSize, 0.9999, sunDot);
                
                // Sun glow varies with height and atmosphere
                float sunGlowIntensity;
                if (sunHeight <= 0.0) {
                    // Below horizon - stronger glow
                    sunGlowIntensity = 1.0;
                } else if (sunHeight < 0.3) {
                    // Low in sky - strong glow
                    sunGlowIntensity = 1.0 - sunHeight * 2.0;
                } else {
                    // Higher in sky - less glow due to less atmosphere
                    sunGlowIntensity = 0.4;
                }
                
                float sunGlow = pow(sunDot, 180.0) * sunGlowIntensity;
                float sunOuterGlow = pow(sunDot, 25.0) * sunGlowIntensity * 0.15;
                
                // Scientific sun colors based on atmospheric physics
                vec3 sunColor = vec3(1.0);
                
                if (sunHeight <= 0.0) {
                    // Below horizon (sunrise/sunset)
                    sunColor = vec3(1.0, 0.4, 0.15); // Deep orange-red
                } else if (sunHeight < 0.2) {
                    // Low in sky
                    float t = sunHeight / 0.2;
                    sunColor = mix(
                        vec3(1.0, 0.4, 0.15), // Deep orange-red
                        vec3(1.0, 0.7, 0.3),  // Orange-yellow
                        t
                    );
                } else {
                    // Higher in sky
                    float t = min(1.0, (sunHeight - 0.2) / 0.6);
                    sunColor = mix(
                        vec3(1.0, 0.7, 0.3),  // Orange-yellow
                        vec3(1.0, 0.95, 0.8), // White-yellow
                        t
                    );
                }
                
                // Add sun only when it should be visible
                if (sunVisibility > 0.0) {
                    // Sun disc
                    skyColor += sunColor * sunDisc;
                    
                    // Inner and outer glow
                    skyColor += sunColor * sunGlow;
                    skyColor += mix(sunColor, vec3(1.0), 0.5) * sunOuterGlow;
                }
                
                // Smaller, realistic moon
                float moonSize = 0.0006; // Even smaller, realistic moon
                float moonDisc = smootherstep(0.9999 - moonSize, 0.9999, moonDot);
                
                // Moon glow depends on moon phase (simplified)
                float moonGlow = pow(moonDot, 250.0) * 0.3;
                float moonOuterGlow = pow(moonDot, 40.0) * 0.06;
                
                // Add moon based on opacity
                if (moonOpacity > 0.0) {
                    // Light gray moon with subtle blue tint
                    vec3 moonColor = vec3(0.9, 0.9, 0.95);
                    
                    // Moon disc with opacity factor
                    skyColor += moonColor * moonDisc * moonOpacity;
                    
                    // Moon glow - very subtle
                    skyColor += vec3(0.6, 0.7, 0.9) * moonGlow * moonOpacity;
                    skyColor += vec3(0.3, 0.4, 0.6) * moonOuterGlow * moonOpacity;
                }
                
                // Apply clouds when enabled
                if (cloudiness > 0.0 && viewHeight > 0.0) {
                    // Cloud pattern generation
                    vec3 cloudCoord = vec3(dir.xz / (viewHeight + 0.1), iTime * 0.01);
                    float cloudBase = noise(cloudCoord * 2.0);
                    float cloudDetail = noise(cloudCoord * 8.0);
                    
                    // Natural cloud formation
                    float cloudPattern = cloudBase * 0.7 + cloudDetail * 0.3;
                    float clouds = smootherstep(1.0 - cloudiness * 0.8, 1.0 - cloudiness * 0.4, cloudPattern);
                    
                    // Cloud colors vary with time of day - physically correct lighting
                    vec3 cloudDayColor = vec3(1.0, 1.0, 1.0);                      // Bright white
                    vec3 cloudDawnColor = vec3(0.95, 0.65, 0.35) * 1.2;            // Golden-orange
                    vec3 cloudNightColor = vec3(0.1, 0.1, 0.15);                   // Dark blue-gray
                    vec3 cloudDuskColor = vec3(0.85, 0.45, 0.25) * 1.2;            // Deep orange-red
                    
                    // Blend cloud colors by time of day
                    vec3 cloudColor = cloudDayColor * dayFactor +
                                     cloudNightColor * nightFactor +
                                     cloudDawnColor * dawnFactor +
                                     cloudDuskColor * duskFactor;
                    
                    // Cloud ambient lighting (dimmer for clouds in shadow)
                    vec3 cloudAmbient = mix(
                        vec3(0.1, 0.1, 0.2), // Night ambient
                        vec3(0.5, 0.5, 0.6), // Day ambient
                        dayFactor + dawnFactor * 0.5 + duskFactor * 0.5
                    );
                    
                    // Direct sun/moon lighting on clouds
                    float sunContribution = max(0.0, dot(vec3(0.0, 1.0, 0.0), sunPosition)) * 0.7;
                    float moonContribution = max(0.0, dot(vec3(0.0, 1.0, 0.0), moonPosition)) * 0.3 * moonOpacity;
                    
                    // Final cloud color with lighting
                    vec3 cloudIllumination = cloudAmbient + cloudColor * (sunContribution + moonContribution);
                    
                    // Blend clouds with sky - more transparent near horizon
                    float cloudOpacity = clouds * cloudiness * min(1.0, viewHeight * 2.0);
                    skyColor = mix(skyColor, cloudIllumination, cloudOpacity);
                }
                
                // Atmospheric haze near horizon - Rayleigh scattering simulation
                if (viewHeight < 0.1) {
                    // Add subtle haze that varies with time of day
                    float hazeFactor = (1.0 - viewHeight * 10.0);
                    vec3 hazeColor = horizonColor * 0.8; // Slightly dimmer than horizon color
                    skyColor = mix(skyColor, hazeColor, hazeFactor * 0.4);
                }
                
                // Tonemap for proper HDR handling and dynamic range
                skyColor = skyColor / (skyColor + vec3(1.0)); // Simple Reinhard tonemapping
                
                // Apply subtle gamma correction for more realistic colors
                skyColor = pow(skyColor, vec3(0.9));
            
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `;
    }
}