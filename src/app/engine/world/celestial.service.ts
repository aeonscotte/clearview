// src/app/engine/world/celestial.service.ts
import { Injectable } from '@angular/core';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { BehaviorSubject, Observable } from 'rxjs';
import { TimeState } from '../physics/time-state.model';
import { TimeService } from '../physics/time.service';
import { MathUtils } from '../utils/math-utils.service';

@Injectable({
  providedIn: 'root'
})
export class CelestialService {
    private timeState: TimeState;
    private timeStateSubject = new BehaviorSubject<TimeState>(null!);
    
    // Pre-allocated objects for calculations to reduce GC pressure
    private _sunDir = new Vector3(0, 0, 0);
    private _moonDir = new Vector3(0, 0, 0);
    private _sunColor = new Color3(0, 0, 0);
    private _moonColor = new Color3(0, 0, 0);
    
    // Define key time points once as constants
    private readonly KEY_TIMES = {
        midnight: 0.0,
        dawnStart: 5.0,
        sunrise: 6.0,
        dawnEnd: 7.0,
        noon: 12.0,
        duskStart: 17.0,
        sunset: 18.0,
        duskEnd: 19.0
    };
    
    constructor(
        private timeService: TimeService,
        private mathUtils: MathUtils
    ) {
        // Initialize with default values
        this.timeState = {
            worldTime: 0,
            normalizedTime: 0,
            dayFactor: 0,
            nightFactor: 0,
            dawnFactor: 0, 
            duskFactor: 0,
            starVisibility: 0,
            sunVisibility: 0,
            moonOpacity: 0,
            sunHeight: 0,
            moonHeight: 0,
            sunIntensity: 0,
            moonIntensity: 0,
            continuousRotation: 0,
            keyTimes: this.KEY_TIMES
        };
        
        // Initial calculation
        this.updateTimeState();
    }

    /**
     * Updates all time-related state in a single calculation
     * Should be called once per frame before other services use the data
     */
    updateTimeState(): void {
        const worldTime = this.timeService.getWorldTime();
        const normalizedTime = (worldTime % 24) / 24; // 0-1 over 24-hour period
        
        // Calculate sun angle
        const sunAngle = (normalizedTime * 2.0 * Math.PI) - (0.5 * Math.PI);
        
        // Calculate sun position using pre-allocated vector
        const sunX = Math.cos(sunAngle);
        const sunY = Math.sin(sunAngle); // -1 at midnight, 0 at sunrise/sunset, +1 at noon
        const sunZ = 0.1; // Slight tilt for better shadows
        
        // Reuse pre-allocated vectors instead of creating new ones
        this._sunDir.set(sunX, sunY, sunZ);
        this._sunDir.normalize();
        
        this._moonDir.set(-sunX, -sunY, sunZ);
        this._moonDir.normalize();
        
        // Calculate period factors (0-1) for each time of day
        
        // Night period (Dusk End to Dawn Start, wrapping around midnight)
        let nightFactor = 0;
        if (worldTime >= this.KEY_TIMES.duskEnd || worldTime <= this.KEY_TIMES.dawnStart) {
            if (worldTime >= this.KEY_TIMES.duskEnd) {
                // Evening to midnight
                nightFactor = this.mathUtils.smootherstep(this.KEY_TIMES.duskEnd, this.KEY_TIMES.duskEnd + 2, worldTime);
            } else {
                // Midnight to dawn start
                nightFactor = this.mathUtils.smootherstep(this.KEY_TIMES.dawnStart, this.KEY_TIMES.dawnStart - 2, worldTime);
            }
        }
        
        // Dawn period (Dawn Start to Dawn End, peaking at Sunrise)
        let dawnFactor = 0;
        if (worldTime >= this.KEY_TIMES.dawnStart && worldTime <= this.KEY_TIMES.dawnEnd) {
            if (worldTime < this.KEY_TIMES.sunrise) {
                // Dawn Start to Sunrise (ramp up)
                dawnFactor = this.mathUtils.smootherstep(this.KEY_TIMES.dawnStart, this.KEY_TIMES.sunrise, worldTime);
            } else {
                // Sunrise to Dawn End (ramp down)
                dawnFactor = this.mathUtils.smootherstep(this.KEY_TIMES.dawnEnd, this.KEY_TIMES.sunrise, worldTime);
            }
        }
        
        // Day period (Dawn End to Dusk Start)
        let dayFactor = 0;
        if (worldTime >= this.KEY_TIMES.dawnEnd && worldTime <= this.KEY_TIMES.duskStart) {
            // Full day phase
            const dayProgress = (worldTime - this.KEY_TIMES.dawnEnd) / (this.KEY_TIMES.duskStart - this.KEY_TIMES.dawnEnd);
            
            // Smoother transition at edges of day
            if (dayProgress < 0.1) {
                dayFactor = this.mathUtils.smootherstep(0, 0.1, dayProgress);
            } else if (dayProgress > 0.9) {
                dayFactor = this.mathUtils.smootherstep(1, 0.9, dayProgress);
            } else {
                dayFactor = 1.0;
            }
        }
        
        // Dusk period (Dusk Start to Dusk End, peaking at Sunset)
        let duskFactor = 0;
        if (worldTime >= this.KEY_TIMES.duskStart && worldTime <= this.KEY_TIMES.duskEnd) {
            if (worldTime < this.KEY_TIMES.sunset) {
                // Dusk Start to Sunset (ramp up)
                duskFactor = this.mathUtils.smootherstep(this.KEY_TIMES.duskStart, this.KEY_TIMES.sunset, worldTime);
            } else {
                // Sunset to Dusk End (ramp down)
                duskFactor = this.mathUtils.smootherstep(this.KEY_TIMES.duskEnd, this.KEY_TIMES.sunset, worldTime);
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
        if (worldTime >= this.KEY_TIMES.sunrise && worldTime <= this.KEY_TIMES.sunset) {
            // Sun is visible from sunrise to sunset
            sunVisibility = 1.0;
        }
        
        // Sun intensity varies throughout the day
        let sunIntensity = 0;
        if (sunVisibility > 0) {
            // Base intensity when sun is visible
            if (worldTime < this.KEY_TIMES.noon) {
                // Sunrise to noon: increase to max
                sunIntensity = this.mathUtils.smootherstep(this.KEY_TIMES.sunrise, this.KEY_TIMES.noon, worldTime) * 1.5;
            } else {
                // Noon to sunset: decrease to min
                sunIntensity = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.noon, worldTime) * 1.5;
            }
        }
        
        // Calculate moon visibility and intensity
        
        // Moon opacity
        let moonOpacity = 0;
        if (worldTime >= this.KEY_TIMES.sunset && worldTime <= this.KEY_TIMES.duskEnd) {
            // Sunset to dusk end: fade in
            moonOpacity = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.duskEnd, worldTime);
        } else if (worldTime >= this.KEY_TIMES.duskEnd || worldTime <= this.KEY_TIMES.dawnStart) {
            // Fully visible during night
            moonOpacity = 1.0;
        } else if (worldTime >= this.KEY_TIMES.dawnStart && worldTime <= this.KEY_TIMES.sunrise) {
            // Dawn start to sunrise: fade out
            moonOpacity = this.mathUtils.smootherstep(this.KEY_TIMES.sunrise, this.KEY_TIMES.dawnStart, worldTime);
        }
        
        // Moon brightness
        let moonIntensity = 0;
        const minMoonIntensity = 0.1;
        const maxMoonIntensity = 0.3;
        
        if (worldTime >= this.KEY_TIMES.sunset && worldTime <= this.KEY_TIMES.duskEnd) {
            // Sunset to dusk end: 0 to min
            moonIntensity = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.duskEnd, worldTime) * minMoonIntensity;
        } else if (worldTime >= this.KEY_TIMES.duskEnd && worldTime <= this.KEY_TIMES.midnight + 24) { // Handle midnight wrapping
            // Dusk end to midnight: min to max
            moonIntensity = this.mathUtils.lerp(minMoonIntensity, maxMoonIntensity, 
                this.mathUtils.smootherstep(this.KEY_TIMES.duskEnd, this.KEY_TIMES.midnight + 24, worldTime));
        } else if (worldTime >= this.KEY_TIMES.midnight && worldTime <= this.KEY_TIMES.dawnStart) {
            // Midnight to dawn start: max to min
            moonIntensity = this.mathUtils.lerp(maxMoonIntensity, minMoonIntensity, 
                this.mathUtils.smootherstep(this.KEY_TIMES.midnight, this.KEY_TIMES.dawnStart, worldTime));
        } else if (worldTime >= this.KEY_TIMES.dawnStart && worldTime <= this.KEY_TIMES.sunrise) {
            // Dawn start to sunrise: min to 0
            moonIntensity = this.mathUtils.smootherstep(this.KEY_TIMES.sunrise, this.KEY_TIMES.dawnStart, worldTime) * minMoonIntensity;
        }
        
        // Apply moon opacity to intensity - if moon isn't visible, intensity is 0
        moonIntensity *= moonOpacity;
        
        // Star visibility
        let starVisibility = 0;
        if (worldTime >= this.KEY_TIMES.duskEnd || worldTime <= this.KEY_TIMES.dawnStart) {
            // Fully visible during night
            starVisibility = 1.0;
        } else if (worldTime >= this.KEY_TIMES.sunset && worldTime <= this.KEY_TIMES.duskEnd) {
            // Sunset to dusk end: fade in
            starVisibility = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.duskEnd, worldTime);
        } else if (worldTime >= this.KEY_TIMES.dawnStart && worldTime <= this.KEY_TIMES.sunrise) {
            // Dawn start to sunrise: fade out
            starVisibility = this.mathUtils.smootherstep(this.KEY_TIMES.sunrise, this.KEY_TIMES.dawnStart, worldTime);
        }
        
        // Get current sun and moon colors (reuse color objects)
        this.getSunColor(worldTime, this.KEY_TIMES.sunrise, this.KEY_TIMES.noon, this.KEY_TIMES.sunset, this._sunColor);
        this._moonColor.set(0.8 * moonOpacity, 0.8 * moonOpacity, 1.0 * moonOpacity);
        
        // Update the time state object with all calculated values
        this.timeState = {
            worldTime,
            normalizedTime,
            dayFactor,
            nightFactor,
            dawnFactor,
            duskFactor,
            starVisibility,
            sunVisibility,
            moonOpacity,
            sunHeight: sunY,
            moonHeight: -sunY,
            sunIntensity,
            moonIntensity,
            continuousRotation: this.timeService.getContinuousRotation(),
            keyTimes: this.KEY_TIMES
        };
        
        // Notify observers about the updated state
        this.timeStateSubject.next(this.timeState);
    }
    
    /**
     * Returns the current time state
     */
    getTimeState(): TimeState {
        return this.timeState;
    }
    
    /**
     * Observable for the time state, notifies subscribers when state updates
     */
    observeTimeState(): Observable<TimeState> {
        return this.timeStateSubject.asObservable();
    }
    
    /**
     * Gets celestial positions for the current world time
     * This method is kept for backward compatibility
     */
    getCelestialPositions() {
        // Return references to pre-allocated objects
        return {
            worldTime: this.timeState.worldTime,
            normalizedTime: this.timeState.normalizedTime,
            sunDir: this._sunDir,
            moonDir: this._moonDir,
            sunHeight: this.timeState.sunHeight,
            moonHeight: this.timeState.moonHeight,
            isDay: this.timeState.dayFactor > 0.5,
            isNight: this.timeState.nightFactor > 0.5,
            isDawn: this.timeState.dawnFactor > 0.5,
            isDusk: this.timeState.duskFactor > 0.5,
            dayFactor: this.timeState.dayFactor,
            nightFactor: this.timeState.nightFactor,
            dawnFactor: this.timeState.dawnFactor,
            duskFactor: this.timeState.duskFactor,
            sunVisibility: this.timeState.sunVisibility,
            moonOpacity: this.timeState.moonOpacity,
            starVisibility: this.timeState.starVisibility,
            sunIntensity: this.timeState.sunIntensity,
            moonIntensity: this.timeState.moonIntensity,
            sunColor: this._sunColor,
            moonColor: this._moonColor,
            keyTimes: this.KEY_TIMES
        };
    }
    
    /**
     * Determines if it's currently night time
     */
    isNight(): boolean {
        return this.timeState.nightFactor > 0.5;
    }
    
    /**
     * Determines if it's currently day time
     */
    isDay(): boolean {
        return this.timeState.dayFactor > 0.5;
    }
    
    /**
     * Determines if it's currently dawn
     */
    isDawn(): boolean {
        return this.timeState.dawnFactor > 0.5;
    }
    
    /**
     * Determines if it's currently dusk
     */
    isDusk(): boolean {
        return this.timeState.duskFactor > 0.5;
    }
    
    /**
     * Returns sun color based on time of day
     * Using scientifically accurate colors for different phases
     * Modified to use reference Color3 for better performance
     */
    private getSunColor(time: number, sunrise: number, noon: number, sunset: number, colorRef: Color3): Color3 {
        // Scientific sun colors based on solar elevation
        const sunriseR = 1.0, sunriseG = 0.6, sunriseB = 0.3;  // Orange-gold at sunrise
        const noonR = 1.0, noonG = 0.95, noonB = 0.8;          // Bright white-yellow at noon
        const sunsetR = 1.0, sunsetG = 0.4, sunsetB = 0.2;     // Deep orange-red at sunset
        
        if (time < sunrise || time > sunset) {
            // Below horizon - use sunset/sunrise color based on which is closer
            colorRef.set(time > sunset ? sunsetR : sunriseR, 
                        time > sunset ? sunsetG : sunriseG, 
                        time > sunset ? sunsetB : sunriseB);
        } else if (time < noon) {
            // Sunrise to noon: blend from sunrise to noon
            const t = this.mathUtils.smootherstep(sunrise, noon, time);
            colorRef.r = this.mathUtils.lerp(sunriseR, noonR, t);
            colorRef.g = this.mathUtils.lerp(sunriseG, noonG, t);
            colorRef.b = this.mathUtils.lerp(sunriseB, noonB, t);
        } else {
            // Noon to sunset: blend from noon to sunset
            const t = this.mathUtils.smootherstep(noon, sunset, time);
            colorRef.r = this.mathUtils.lerp(noonR, sunsetR, t);
            colorRef.g = this.mathUtils.lerp(noonG, sunsetG, t);
            colorRef.b = this.mathUtils.lerp(noonB, sunsetB, t);
        }
        
        return colorRef;
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
            
            // Update time state for debug
            this.updateTimeState();
            
            // Get the state for this time point
            const state = this.getTimeState();
            
            console.log(`${labels[i]} (${time}h):`, {
                sunHeight: state.sunHeight.toFixed(2), 
                moonHeight: state.moonHeight.toFixed(2),
                dayFactor: state.dayFactor.toFixed(2),
                nightFactor: state.nightFactor.toFixed(2),
                dawnFactor: state.dawnFactor.toFixed(2),
                duskFactor: state.duskFactor.toFixed(2),
                sunIntensity: state.sunIntensity.toFixed(2),
                moonIntensity: state.moonIntensity.toFixed(2),
                sunVisibility: state.sunVisibility.toFixed(2),
                moonOpacity: state.moonOpacity.toFixed(2),
                starVisibility: state.starVisibility.toFixed(2)
            });
            
            // Restore actual time
            timeService.elapsed = (currentTime / 24) * timeService.dayDurationInSeconds;
            this.updateTimeState(); // Update state back to current time
        }
        console.groupEnd();
    }
}