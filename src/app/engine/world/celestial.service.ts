// src/app/engine/world/celestial.service.ts
import { Injectable } from '@angular/core';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { TimeService } from '../physics/time.service';

@Injectable({
  providedIn: 'root'
})
export class CelestialService {
    constructor(private timeService: TimeService) {}
    
    /**
     * Gets all celestial positions and lighting factors based on current world time
     * Key time points as specified:
     * - 00:00 = Midnight (Moon at zenith)
     * - 05:00 = Dawn Start
     * - 06:00 = Sunrise (Sun at horizon)
     * - 07:00 = Dawn End
     * - 12:00 = Noon (Sun at zenith)
     * - 17:00 = Dusk Start
     * - 18:00 = Sunset (Sun at horizon)
     * - 19:00 = Dusk End
     * - 24:00 = Midnight (Moon at zenith)
     */
    getCelestialPositions() {
        const worldTime = this.timeService.getWorldTime(); // 0-24 hours
        const normalizedTime = (worldTime % 24) / 24; // 0-1 over 24-hour period
        
        // Define key time points (in hours)
        const midnight = 0.0;
        const dawnStart = 5.0;
        const sunrise = 6.0;
        const dawnEnd = 7.0;
        const noon = 12.0;
        const duskStart = 17.0;
        const sunset = 18.0;
        const duskEnd = 19.0;
        
        // Calculate sun angle
        // At midnight (0h): sun angle = -90° (below horizon)
        // At noon (12h): sun angle = +90° (at zenith)
        const sunAngle = (normalizedTime * 2.0 * Math.PI) - (0.5 * Math.PI);
        
        // Calculate sun position
        const sunX = Math.cos(sunAngle);
        const sunY = Math.sin(sunAngle); // -1 at midnight, 0 at sunrise/sunset, +1 at noon
        const sunZ = 0.1; // Slight tilt for better shadows
        
        // Create direction vectors (normalized)
        const sunDir = new Vector3(sunX, sunY, sunZ).normalize();
        // Moon is exactly opposite the sun
        const moonDir = new Vector3(-sunX, -sunY, sunZ).normalize();
        
        // Calculate period factors (0-1) for each time of day
        
        // Night period (Dusk End to Dawn Start, wrapping around midnight)
        let nightFactor = 0;
        if (worldTime >= duskEnd || worldTime <= dawnStart) {
            if (worldTime >= duskEnd) {
                // Evening to midnight
                nightFactor = this.smootherstep(duskEnd, duskEnd + 2, worldTime);
            } else {
                // Midnight to dawn start
                nightFactor = this.smootherstep(dawnStart, dawnStart - 2, worldTime);
            }
        }
        
        // Dawn period (Dawn Start to Dawn End, peaking at Sunrise)
        let dawnFactor = 0;
        if (worldTime >= dawnStart && worldTime <= dawnEnd) {
            if (worldTime < sunrise) {
                // Dawn Start to Sunrise (ramp up)
                dawnFactor = this.smootherstep(dawnStart, sunrise, worldTime);
            } else {
                // Sunrise to Dawn End (ramp down)
                dawnFactor = this.smootherstep(dawnEnd, sunrise, worldTime);
            }
        }
        
        // Day period (Dawn End to Dusk Start)
        let dayFactor = 0;
        if (worldTime >= dawnEnd && worldTime <= duskStart) {
            // Full day phase
            const dayProgress = (worldTime - dawnEnd) / (duskStart - dawnEnd);
            
            // Smoother transition at edges of day
            if (dayProgress < 0.1) {
                dayFactor = this.smootherstep(0, 0.1, dayProgress);
            } else if (dayProgress > 0.9) {
                dayFactor = this.smootherstep(1, 0.9, dayProgress);
            } else {
                dayFactor = 1.0;
            }
        }
        
        // Dusk period (Dusk Start to Dusk End, peaking at Sunset)
        let duskFactor = 0;
        if (worldTime >= duskStart && worldTime <= duskEnd) {
            if (worldTime < sunset) {
                // Dusk Start to Sunset (ramp up)
                duskFactor = this.smootherstep(duskStart, sunset, worldTime);
            } else {
                // Sunset to Dusk End (ramp down)
                duskFactor = this.smootherstep(duskEnd, sunset, worldTime);
            }
        }
        
        // Normalize factors to ensure they sum to 1.0
        const totalFactor = nightFactor + dawnFactor + dayFactor + duskFactor;
        if (totalFactor > 0.001) {
            nightFactor /= totalFactor;
            dawnFactor /= totalFactor;
            dayFactor /= totalFactor;
            duskFactor /= totalFactor;
        } else {
            // Fallback if all factors are too small
            dayFactor = 1.0;
        }
        
        // Calculate sun visibility and intensity
        let sunVisibility = 0;
        if (worldTime >= sunrise && worldTime <= sunset) {
            // Sun is visible from sunrise to sunset
            sunVisibility = 1.0;
        }
        
        // Sun intensity varies throughout the day
        let sunIntensity = 0;
        if (sunVisibility > 0) {
            // Base intensity when sun is visible
            if (worldTime < noon) {
                // Sunrise to noon: increase to max
                sunIntensity = this.smootherstep(sunrise, noon, worldTime) * 1.5;
            } else {
                // Noon to sunset: decrease to min
                sunIntensity = this.smootherstep(sunset, noon, worldTime) * 1.5;
            }
        }
        
        // Calculate moon visibility and intensity
        
        // Moon opacity
        let moonOpacity = 0;
        if (worldTime >= sunset && worldTime <= duskEnd) {
            // Sunset to dusk end: fade in
            moonOpacity = this.smootherstep(sunset, duskEnd, worldTime);
        } else if (worldTime >= duskEnd || worldTime <= dawnStart) {
            // Fully visible during night
            moonOpacity = 1.0;
        } else if (worldTime >= dawnStart && worldTime <= sunrise) {
            // Dawn start to sunrise: fade out
            moonOpacity = this.smootherstep(sunrise, dawnStart, worldTime);
        }
        
        // Moon brightness
        let moonIntensity = 0;
        const minMoonIntensity = 0.1;
        const maxMoonIntensity = 0.3;
        
        if (worldTime >= sunset && worldTime <= duskEnd) {
            // Sunset to dusk end: 0 to min
            moonIntensity = this.smootherstep(sunset, duskEnd, worldTime) * minMoonIntensity;
        } else if (worldTime >= duskEnd && worldTime <= midnight + 24) { // Handle midnight wrapping
            // Dusk end to midnight: min to max
            moonIntensity = this.lerp(minMoonIntensity, maxMoonIntensity, 
                this.smootherstep(duskEnd, midnight + 24, worldTime));
        } else if (worldTime >= midnight && worldTime <= dawnStart) {
            // Midnight to dawn start: max to min
            moonIntensity = this.lerp(maxMoonIntensity, minMoonIntensity, 
                this.smootherstep(midnight, dawnStart, worldTime));
        } else if (worldTime >= dawnStart && worldTime <= sunrise) {
            // Dawn start to sunrise: min to 0
            moonIntensity = this.smootherstep(sunrise, dawnStart, worldTime) * minMoonIntensity;
        }
        
        // Apply moon opacity to intensity - if moon isn't visible, intensity is 0
        moonIntensity *= moonOpacity;
        
        // Star visibility
        let starVisibility = 0;
        if (worldTime >= duskEnd || worldTime <= dawnStart) {
            // Fully visible during night
            starVisibility = 1.0;
        } else if (worldTime >= sunset && worldTime <= duskEnd) {
            // Sunset to dusk end: fade in
            starVisibility = this.smootherstep(sunset, duskEnd, worldTime);
        } else if (worldTime >= dawnStart && worldTime <= sunrise) {
            // Dawn start to sunrise: fade out
            starVisibility = this.smootherstep(sunrise, dawnStart, worldTime);
        }
        
        // Get current sun and moon colors
        const sunColor = this.getSunColor(worldTime, sunrise, noon, sunset);
        const moonColor = new Color3(0.8 * moonOpacity, 0.8 * moonOpacity, 1.0 * moonOpacity);
        
        return {
            // Positions
            worldTime,         // Current world time (0-24)
            normalizedTime,    // Time as 0-1 factor (0=midnight, 0.5=noon)
            sunDir,            // Direction vector to sun
            moonDir,           // Direction vector to moon
            sunHeight: sunY,   // Sun height (-1 to 1)
            moonHeight: -sunY, // Moon height (-1 to 1)
            
            // Time factors
            isDay: dayFactor > 0.5,             // True during primary daylight hours
            isNight: nightFactor > 0.5,         // True during primary night hours
            isDawn: dawnFactor > 0.5,           // True during dawn
            isDusk: duskFactor > 0.5,           // True during dusk
            dayFactor,                          // Day intensity
            nightFactor,                        // Night intensity
            dawnFactor,                         // Dawn intensity
            duskFactor,                         // Dusk intensity
            
            // Celestial object properties
            sunVisibility,                      // 0-1 based on time of day
            moonOpacity,                        // 0-1 based on time of day
            starVisibility,                     // 0-1 based on time of day
            
            // Lighting values
            sunIntensity,                       // Sun intensity based on height and time
            moonIntensity,                      // Moon intensity based on time
            sunColor,                           // Changes based on time of day
            moonColor,                          // Moon color with opacity applied
            
            // Key time points for other services
            keyTimes: {
                midnight, dawnStart, sunrise, dawnEnd, 
                noon, duskStart, sunset, duskEnd
            }
        };
    }
    
    /**
     * Determines if it's currently night time
     */
    isNight(): boolean {
        const { isNight } = this.getCelestialPositions();
        return isNight;
    }
    
    /**
     * Determines if it's currently day time
     */
    isDay(): boolean {
        const { isDay } = this.getCelestialPositions();
        return isDay;
    }
    
    /**
     * Determines if it's currently dawn
     */
    isDawn(): boolean {
        const { isDawn } = this.getCelestialPositions();
        return isDawn;
    }
    
    /**
     * Determines if it's currently dusk
     */
    isDusk(): boolean {
        const { isDusk } = this.getCelestialPositions();
        return isDusk;
    }
    
    /**
     * Linear interpolation between two values
     */
    private lerp(a: number, b: number, t: number): number {
        return a + t * (b - a);
    }
    
    /**
     * Returns sun color based on time of day
     * Using scientifically accurate colors for different phases
     */
    private getSunColor(time: number, sunrise: number, noon: number, sunset: number): Color3 {
        // Scientific sun colors based on solar elevation
        const sunriseColor = new Color3(1.0, 0.6, 0.3);      // Orange-gold at sunrise
        const noonColor = new Color3(1.0, 0.95, 0.8);        // Bright white-yellow at noon
        const sunsetColor = new Color3(1.0, 0.4, 0.2);       // Deep orange-red at sunset
        
        if (time < sunrise || time > sunset) {
            // Below horizon - use sunset/sunrise color based on which is closer
            return (time > sunset) ? sunsetColor : sunriseColor;
        } else if (time < noon) {
            // Sunrise to noon: blend from sunrise to noon
            const t = this.smootherstep(sunrise, noon, time);
            return Color3.Lerp(sunriseColor, noonColor, t);
        } else {
            // Noon to sunset: blend from noon to sunset
            const t = this.smootherstep(noon, sunset, time);
            return Color3.Lerp(noonColor, sunsetColor, t);
        }
    }
    
    /**
     * Enhanced smoothstep function for smoother transitions
     * More gradual than standard smoothstep
     */
    private smootherstep(edge0: number, edge1: number, x: number): number {
        // Handle edge case where edge0 > edge1 (for wrapping around midnight)
        if (edge0 > edge1 && x < edge0 && x < edge1) {
            x += 24; // Wrap around for time calculations
        }
        
        // Clamp x to 0..1 range
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        
        // Evaluate 6x^5 - 15x^4 + 10x^3 (better for more gradual transitions)
        return x * x * x * (x * (x * 6 - 15) + 10);
    }
    
    /**
     * Debug function to test celestial positions at specific times
     */
    debugCelestialPositions(): void {
        const times = [0, 5, 6, 7, 12, 17, 18, 19, 24];
        const labels = ["Midnight", "Dawn Start", "Sunrise", "Dawn End", "Noon", 
                        "Dusk Start", "Sunset", "Dusk End", "Midnight"];
        
        console.group("Celestial Positions Debug");
        for (let i = 0; i < times.length; i++) {
            const time = times[i];
            // Store current time
            const currentTime = this.timeService.getWorldTime();
            
            // Override time for testing
            const timeService = this.timeService as any;
            timeService.elapsed = (time / 24) * timeService.dayDurationInSeconds;
            
            const pos = this.getCelestialPositions();
            console.log(`${labels[i]} (${time}h):`, {
                sunHeight: pos.sunHeight.toFixed(2), 
                moonHeight: pos.moonHeight.toFixed(2),
                dayFactor: pos.dayFactor.toFixed(2),
                nightFactor: pos.nightFactor.toFixed(2),
                dawnFactor: pos.dawnFactor.toFixed(2),
                duskFactor: pos.duskFactor.toFixed(2),
                sunIntensity: pos.sunIntensity.toFixed(2),
                moonIntensity: pos.moonIntensity.toFixed(2),
                sunVisibility: pos.sunVisibility.toFixed(2),
                moonOpacity: pos.moonOpacity.toFixed(2),
                starVisibility: pos.starVisibility.toFixed(2)
            });
            
            // Restore actual time
            timeService.elapsed = (currentTime / 24) * timeService.dayDurationInSeconds;
        }
        console.groupEnd();
    }
}