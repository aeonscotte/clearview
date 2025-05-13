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
     * Key time points:
     * - 0 hours = Midnight (Moon at zenith)
     * - 6 hours = Sunrise (Sun at horizon)
     * - 12 hours = Noon (Sun at zenith)
     * - 18 hours = Sunset (Sun at horizon)
     */
    getCelestialPositions() {
        const worldTime = this.timeService.getWorldTime(); // 0-24 hours
        const normalizedTime = (worldTime % 24) / 24; // 0-1 over 24-hour period
        
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
        
        // Determine if it's day or night
        const isNight = sunY < 0; // True when sun is below horizon
        const isDay = sunY > 0;   // True when sun is above horizon
        
        // Calculate precise lighting intensities
        // Sun intensity increases with height when above horizon, 0 when below
        const sunIntensity = Math.max(0, sunY) * 1.5; // Max 1.5 at noon
        
        // Moon intensity increases with height when above horizon, 0 when below
        const moonIntensity = Math.max(0, -sunY) * 0.3; // Max 0.3 at midnight
        
        // Calculate time-of-day factors for color blending (more precise transitions)
        // Full daylight when sun is high
        const dayFactor = isDay ? Math.min(1, sunY * 2.0) : 0;
        
        // Full night when sun is well below horizon
        const nightFactor = isNight ? Math.min(1, -sunY * 2.0) : 0;
        
        // Dawn factor peaks at sunrise (6h, normalizedTime = 0.25)
        const dawnFactor = Math.max(0, 1.0 - Math.abs((normalizedTime - 0.25) * 16.0));
        
        // Dusk factor peaks at sunset (18h, normalizedTime = 0.75)
        const duskFactor = Math.max(0, 1.0 - Math.abs((normalizedTime - 0.75) * 16.0));
        
        // Get sun and moon colors based on height
        const sunColor = this.getSunColor(sunY);
        const moonColor = new Color3(0.8, 0.8, 1.0); // Consistent cool blue moonlight
        
        return {
            // Positions
            worldTime,         // Current world time (0-24)
            normalizedTime,    // Time as 0-1 factor (0=midnight, 0.5=noon)
            sunDir,            // Direction vector to sun
            moonDir,           // Direction vector to moon
            sunHeight: sunY,   // Sun height (-1 to 1)
            moonHeight: -sunY, // Moon height (-1 to 1)
            
            // Time factors
            isDay,             // True during daylight hours
            isNight,           // True during night hours
            dayFactor,         // 0 at night, 1 at noon
            nightFactor,       // 0 during day, 1 at midnight
            dawnFactor,        // Peaks at sunrise
            duskFactor,        // Peaks at sunset
            
            // Lighting values
            sunIntensity,      // 0 at night, peaks at noon
            moonIntensity,     // 0 during day, peaks at midnight
            sunColor,          // Changes based on time of day
            moonColor          // Consistent blue-white
        };
    }
    
    /**
     * Determines if it's currently night time based on sun position
     */
    isNight(): boolean {
        const { isNight } = this.getCelestialPositions();
        return isNight;
    }
    
    /**
     * Determines if it's currently day time based on sun position
     */
    isDay(): boolean {
        const { isDay } = this.getCelestialPositions();
        return isDay;
    }
    
    /**
     * Returns the current sun color based on its height
     * - Warm white at noon
     * - Orange/red near horizon
     */
    private getSunColor(sunHeight: number): Color3 {
        if (sunHeight <= 0) {
            // Below horizon - sunset/sunrise orange
            return new Color3(1.0, 0.5, 0.2);
        } else if (sunHeight < 0.2) {
            // Just above horizon - blend from orange to yellow
            const t = sunHeight / 0.2;
            return Color3.Lerp(
                new Color3(1.0, 0.5, 0.2), // Sunset orange
                new Color3(1.0, 0.8, 0.5), // Sunrise yellow
                t
            );
        } else {
            // Higher in sky - blend from yellow to white
            const t = Math.min(1, (sunHeight - 0.2) / 0.6);
            return Color3.Lerp(
                new Color3(1.0, 0.8, 0.5), // Sunrise yellow
                new Color3(1.0, 0.95, 0.8), // Noon white-yellow
                t
            );
        }
    }
    
    /**
     * Helper function to debug sun/moon positions at specific times
     */
    debugCelestialPositions(): void {
        // Print positions at key times
        const times = [0, 6, 12, 18, 24];
        const labels = ["Midnight", "Sunrise", "Noon", "Sunset", "Midnight"];
        
        console.group("Celestial Positions Debug");
        for (let i = 0; i < times.length; i++) {
            const time = times[i];
            // Store current time
            const currentTime = this.timeService.getWorldTime();
            
            // Override time for testing
            const timeService = this.timeService as any;
            timeService.elapsed = (time / 24) * timeService.dayDurationInSeconds;
            
            const positions = this.getCelestialPositions();
            console.log(`${labels[i]} (${time}h):`, {
                sunHeight: positions.sunHeight.toFixed(2), 
                moonHeight: positions.moonHeight.toFixed(2),
                sunIntensity: positions.sunIntensity.toFixed(2),
                moonIntensity: positions.moonIntensity.toFixed(2),
                isDay: positions.isDay,
                isNight: positions.isNight
            });
            
            // Restore actual time
            timeService.elapsed = (currentTime / 24) * timeService.dayDurationInSeconds;
        }
        console.groupEnd();
    }
}