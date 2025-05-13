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
     * - 5:30 hours = Night ends, dawn begins
     * - 6:30 hours = Dawn ends, day begins
     * - 12 hours = Noon (Sun at zenith)
     * - 17:30 hours = Day ends, dusk begins
     * - 18:30 hours = Dusk ends, night begins
     */
    getCelestialPositions() {
        const worldTime = this.timeService.getWorldTime(); // 0-24 hours
        const normalizedTime = (worldTime % 24) / 24; // 0-1 over 24-hour period
        
        // Calculate sun angle
        const sunAngle = (normalizedTime * 2.0 * Math.PI) - (0.5 * Math.PI);
        
        // Calculate sun position
        const sunX = Math.cos(sunAngle);
        const sunY = Math.sin(sunAngle); // -1 at midnight, 0 at sunrise/sunset, +1 at noon
        const sunZ = 0.1; // Slight tilt for better shadows
        
        // Create direction vectors (normalized)
        const sunDir = new Vector3(sunX, sunY, sunZ).normalize();
        // Moon is exactly opposite the sun
        const moonDir = new Vector3(-sunX, -sunY, sunZ).normalize();
        
        // Define time windows (in 24-hour format, as normalized values 0-1)
        const nightStartNorm = 18.5 / 24;   // 18:30
        const nightEndNorm = 5.5 / 24;      // 05:30
        const dawnStartNorm = 5.5 / 24;     // 05:30
        const dawnEndNorm = 6.5 / 24;       // 06:30
        const dayStartNorm = 6.5 / 24;      // 06:30
        const dayEndNorm = 17.5 / 24;       // 17:30
        const duskStartNorm = 17.5 / 24;    // 17:30
        const duskEndNorm = 18.5 / 24;      // 18:30
        
        // Calculate precise time-of-day factors using smoothstep for smooth transitions
        
        // Night factor (18:30-00:00 and 00:00-05:30)
        // Handle the night wrapping around midnight
        let nightFactor = 0;
        if (normalizedTime >= nightStartNorm || normalizedTime <= nightEndNorm) {
            // If we're after night start or before night end, calculate appropriate factor
            if (normalizedTime >= nightStartNorm) {
                // Evening portion (18:30-00:00): ramp up from 0 to 1
                nightFactor = Math.min(1, (normalizedTime - nightStartNorm) / (1 - nightStartNorm) * 1.5);
            } else {
                // Morning portion (00:00-05:30): stay at 1, then start ramping down
                nightFactor = Math.min(1, 1 - (normalizedTime / nightEndNorm) * 0.3);
            }
        }
        
        // Dawn factor (05:30-06:30)
        let dawnFactor = normalizedTime >= dawnStartNorm && normalizedTime <= dawnEndNorm 
            ? this.smoothstep(0, 1, (normalizedTime - dawnStartNorm) / (dawnEndNorm - dawnStartNorm))
            : 0;
        
        // Day factor (06:30-17:30)
        let dayFactor = 0;
        if (normalizedTime >= dayStartNorm && normalizedTime <= dayEndNorm) {
            // Ramp up at start of day
            if (normalizedTime < dayStartNorm + 0.02) {
                dayFactor = (normalizedTime - dayStartNorm) / 0.02;
            } 
            // Ramp down at end of day
            else if (normalizedTime > dayEndNorm - 0.02) {
                dayFactor = (dayEndNorm - normalizedTime) / 0.02;
            } 
            // Full day in the middle
            else {
                dayFactor = 1;
            }
        }
        
        // Dusk factor (17:30-18:30)
        let duskFactor = normalizedTime >= duskStartNorm && normalizedTime <= duskEndNorm 
            ? this.smoothstep(0, 1, (normalizedTime - duskStartNorm) / (duskEndNorm - duskStartNorm))
            : 0;
        
        // Normalize the factors to ensure they sum to 1 (essential for proper blending)
        const totalFactor = nightFactor + dawnFactor + dayFactor + duskFactor;
        if (totalFactor > 0) {
            nightFactor /= totalFactor;
            dawnFactor /= totalFactor;
            dayFactor /= totalFactor;
            duskFactor /= totalFactor;
        }
        
        // Get sun and moon colors, adjusted for time of day
        const sunColor = this.getSunColor(sunY);
        
        // Moon intensity should be dimmed during dawn and dusk
        const baseMoonIntensity = Math.max(0, -sunY) * 0.3; // Original calculation
        const moonDimFactor = 1 - (dawnFactor + duskFactor) * 0.8; // Dim by 80% at peak dawn/dusk
        const moonIntensity = baseMoonIntensity * moonDimFactor;
        
        // Consistent cool blue moonlight, dimmed at dawn/dusk
        const moonColor = new Color3(
            0.8 * moonDimFactor, 
            0.8 * moonDimFactor, 
            1.0 * moonDimFactor
        );
        
        return {
            // Positions
            worldTime,         // Current world time (0-24)
            normalizedTime,    // Time as 0-1 factor (0=midnight, 0.5=noon)
            sunDir,            // Direction vector to sun
            moonDir,           // Direction vector to moon
            sunHeight: sunY,   // Sun height (-1 to 1)
            moonHeight: -sunY, // Moon height (-1 to 1)
            
            // Time factors - these are now based on strict time windows
            isDay: dayFactor > 0.1,          // True during daylight hours
            isNight: nightFactor > 0.1,      // True during night hours
            isDawn: dawnFactor > 0.1,        // True during dawn
            isDusk: duskFactor > 0.1,        // True during dusk
            dayFactor,                        // Based on 06:30-17:30 time window
            nightFactor,                      // Based on 18:30-05:30 time window
            dawnFactor,                       // Based on 05:30-06:30 time window  
            duskFactor,                       // Based on 17:30-18:30 time window
            
            // Lighting values
            sunIntensity: Math.max(0, sunY) * 1.5 * (1 - nightFactor * 0.8),  // Adjusted for smoother transitions
            moonIntensity,     // Dimmed during dawn/dusk
            sunColor,          // Changes based on time of day
            moonColor          // Consistent blue-white, dimmed at dawn/dusk
        };
    }
    
    /**
     * Determines if it's currently night time based on time factors
     */
    isNight(): boolean {
        const { isNight } = this.getCelestialPositions();
        return isNight;
    }
    
    /**
     * Determines if it's currently day time based on time factors
     */
    isDay(): boolean {
        const { isDay } = this.getCelestialPositions();
        return isDay;
    }
    
    /**
     * Determines if it's currently dawn based on time factors
     */
    isDawn(): boolean {
        const { isDawn } = this.getCelestialPositions();
        return isDawn;
    }
    
    /**
     * Determines if it's currently dusk based on time factors
     */
    isDusk(): boolean {
        const { isDusk } = this.getCelestialPositions();
        return isDusk;
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
     * Helper function for smoothstep interpolation
     * Creates smooth transition between edge0 and edge1
     */
    private smoothstep(edge0: number, edge1: number, x: number): number {
        // Scale, bias and saturate x to 0..1 range
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        // Evaluate polynomial
        return x * x * (3 - 2 * x);
    }
    
    /**
     * Helper function to debug sun/moon positions at specific times
     */
    debugCelestialPositions(): void {
        // Print positions at key times
        const times = [0, 5.5, 6.5, 12, 17.5, 18.5, 24];
        const labels = ["Midnight", "Dawn Start", "Day Start", "Noon", "Dusk Start", "Night Start", "Midnight"];
        
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
                dayFactor: positions.dayFactor.toFixed(2),
                nightFactor: positions.nightFactor.toFixed(2),
                dawnFactor: positions.dawnFactor.toFixed(2),
                duskFactor: positions.duskFactor.toFixed(2),
                sunIntensity: positions.sunIntensity.toFixed(2),
                moonIntensity: positions.moonIntensity.toFixed(2),
                isDay: positions.isDay,
                isNight: positions.isNight,
                isDawn: positions.isDawn,
                isDusk: positions.isDusk
            });
            
            // Restore actual time
            timeService.elapsed = (currentTime / 24) * timeService.dayDurationInSeconds;
        }
        console.groupEnd();
    }
}