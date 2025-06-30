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
    // Use single timeState object that gets updated, not recreated
    private timeState: TimeState;
    private timeStateSubject = new BehaviorSubject<TimeState>(null!);
    
    // Pre-allocated vectors/colors to reduce GC pressure
    private _sunDir = new Vector3(0, 0, 0);
    private _moonDir = new Vector3(0, 0, 0);
    private _sunColor = new Color3(0, 0, 0);
    private _moonColor = new Color3(0, 0, 0);
    
    // Pre-allocated celestial positions object for getCelestialPositions
    private _celestialPositions: any = {
        worldTime: 0,
        normalizedTime: 0,
        sunDir: this._sunDir,
        moonDir: this._moonDir,
        sunHeight: 0,
        moonHeight: 0,
        isDay: false,
        isNight: false,
        isDawn: false,
        isDusk: false,
        dayFactor: 0,
        nightFactor: 0,
        dawnFactor: 0,
        duskFactor: 0,
        sunVisibility: 0,
        moonOpacity: 0,
        starVisibility: 0,
        sunIntensity: 0,
        moonIntensity: 0,
        sunColor: this._sunColor,
        moonColor: this._moonColor,
        keyTimes: null
    };
    
    // Key time points in 24h format
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
        // Initialize with default values in constructor
        this.timeState = {
            worldTime: 0, normalizedTime: 0,
            dayFactor: 0, nightFactor: 0, dawnFactor: 0, duskFactor: 0,
            starVisibility: 0, sunVisibility: 0, moonOpacity: 0,
            sunHeight: 0, moonHeight: 0,
            sunIntensity: 0, moonIntensity: 0,
            continuousRotation: 0,
            keyTimes: this.KEY_TIMES
        };
        
        // Set the key times reference in the celestial positions object
        this._celestialPositions.keyTimes = this.KEY_TIMES;
        
        this.updateTimeState(); // Initial calculation
    }

    // Updates all time-related state - call once per frame before other services use the data
    updateTimeState(): void {
        const worldTime = this.timeService.getWorldTime();
        const normalizedTime = (worldTime % 24) / 24; // 0-1 over 24-hour period
        
        // Calculate sun position
        const sunAngle = (normalizedTime * 2.0 * Math.PI) - (0.5 * Math.PI);
        const sunX = Math.cos(sunAngle);
        const sunY = Math.sin(sunAngle); // -1 at midnight, 0 at sunrise/sunset, +1 at noon
        const sunZ = 0.1; // Slight tilt for better shadows
        
        // Set pre-allocated vectors
        this._sunDir.set(sunX, sunY, sunZ).normalize();
        this._moonDir.set(-sunX, -sunY, sunZ).normalize();
        
        // Calculate time period factors (0-1)
        
        // Night period (Dusk End to Dawn Start)
        let nightFactor = 0;
        if (worldTime >= this.KEY_TIMES.duskEnd || worldTime <= this.KEY_TIMES.dawnStart) {
            if (worldTime >= this.KEY_TIMES.duskEnd) {
                nightFactor = this.mathUtils.smootherstep(this.KEY_TIMES.duskEnd, this.KEY_TIMES.duskEnd + 2, worldTime); // Evening to midnight
            } else {
                nightFactor = this.mathUtils.smootherstep(this.KEY_TIMES.dawnStart, this.KEY_TIMES.dawnStart - 2, worldTime); // Midnight to dawn
            }
        }
        
        // Dawn period (Dawn Start to Dawn End, peaking at Sunrise)
        let dawnFactor = 0;
        if (worldTime >= this.KEY_TIMES.dawnStart && worldTime <= this.KEY_TIMES.dawnEnd) {
            if (worldTime < this.KEY_TIMES.sunrise) {
                dawnFactor = this.mathUtils.smootherstep(this.KEY_TIMES.dawnStart, this.KEY_TIMES.sunrise, worldTime); // Ramp up
            } else {
                dawnFactor = this.mathUtils.smootherstep(this.KEY_TIMES.dawnEnd, this.KEY_TIMES.sunrise, worldTime); // Ramp down
            }
        }
        
        // Day period (Dawn End to Dusk Start)
        let dayFactor = 0;
        if (worldTime >= this.KEY_TIMES.dawnEnd && worldTime <= this.KEY_TIMES.duskStart) {
            // Calculate normalized day progress
            const dayProgress = (worldTime - this.KEY_TIMES.dawnEnd) / (this.KEY_TIMES.duskStart - this.KEY_TIMES.dawnEnd);
            
            // Smoother transition at day edges
            if (dayProgress < 0.1) {
                dayFactor = this.mathUtils.smootherstep(0, 0.1, dayProgress);
            } else if (dayProgress > 0.9) {
                dayFactor = this.mathUtils.smootherstep(1, 0.9, dayProgress);
            } else {
                dayFactor = 1.0; // Full day
            }
        }
        
        // Dusk period (Dusk Start to Dusk End, peaking at Sunset)
        let duskFactor = 0;
        if (worldTime >= this.KEY_TIMES.duskStart && worldTime <= this.KEY_TIMES.duskEnd) {
            if (worldTime < this.KEY_TIMES.sunset) {
                duskFactor = this.mathUtils.smootherstep(this.KEY_TIMES.duskStart, this.KEY_TIMES.sunset, worldTime); // Ramp up
            } else {
                duskFactor = this.mathUtils.smootherstep(this.KEY_TIMES.duskEnd, this.KEY_TIMES.sunset, worldTime); // Ramp down
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
            dayFactor = 1.0; // Fallback if all factors are too small
        }
        
        // Sun visibility and intensity (visible from sunrise to sunset)
        let sunVisibility = (worldTime >= this.KEY_TIMES.sunrise && worldTime <= this.KEY_TIMES.sunset) ? 1.0 : 0.0;
        
        // Sun intensity varies throughout the day
        let sunIntensity = 0;
        if (sunVisibility > 0) {
            if (worldTime < this.KEY_TIMES.noon) {
                sunIntensity = this.mathUtils.smootherstep(this.KEY_TIMES.sunrise, this.KEY_TIMES.noon, worldTime) * 1.5; // Rise to max
            } else {
                sunIntensity = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.noon, worldTime) * 1.5; // Fall from max
            }
        }
        
        // Moon visibility and intensity
        
        // Moon opacity (fades in after sunset, out before sunrise)
        let moonOpacity = 0;
        if (worldTime >= this.KEY_TIMES.sunset && worldTime <= this.KEY_TIMES.duskEnd) {
            moonOpacity = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.duskEnd, worldTime); // Fade in
        } else if (worldTime >= this.KEY_TIMES.duskEnd || worldTime <= this.KEY_TIMES.dawnStart) {
            moonOpacity = 1.0; // Fully visible at night
        } else if (worldTime >= this.KEY_TIMES.dawnStart && worldTime <= this.KEY_TIMES.sunrise) {
            moonOpacity = this.mathUtils.smootherstep(this.KEY_TIMES.sunrise, this.KEY_TIMES.dawnStart, worldTime); // Fade out
        }
        
        // Moon brightness
        let moonIntensity = 0;
        const minMoonIntensity = 0.1;
        const maxMoonIntensity = 0.3;
        
        if (worldTime >= this.KEY_TIMES.sunset && worldTime <= this.KEY_TIMES.duskEnd) {
            // Sunset to dusk end: 0 to min
            moonIntensity = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.duskEnd, worldTime) * minMoonIntensity;
        } else if (worldTime >= this.KEY_TIMES.duskEnd && worldTime <= this.KEY_TIMES.midnight + 24) {
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
        
        moonIntensity *= moonOpacity; // No intensity if moon isn't visible
        
        // Star visibility (fully visible at night, fade at dawn/dusk)
        let starVisibility = 0;
        if (worldTime >= this.KEY_TIMES.duskEnd || worldTime <= this.KEY_TIMES.dawnStart) {
            starVisibility = 1.0; // Fully visible at night
        } else if (worldTime >= this.KEY_TIMES.sunset && worldTime <= this.KEY_TIMES.duskEnd) {
            starVisibility = this.mathUtils.smootherstep(this.KEY_TIMES.sunset, this.KEY_TIMES.duskEnd, worldTime); // Fade in
        } else if (worldTime >= this.KEY_TIMES.dawnStart && worldTime <= this.KEY_TIMES.sunrise) {
            starVisibility = this.mathUtils.smootherstep(this.KEY_TIMES.sunrise, this.KEY_TIMES.dawnStart, worldTime); // Fade out
        }
        
        // Get current sun and moon colors - use pre-allocated colors
        this.getSunColor(worldTime, this.KEY_TIMES.sunrise, this.KEY_TIMES.noon, this.KEY_TIMES.sunset, this._sunColor);
        this._moonColor.set(0.8 * moonOpacity, 0.8 * moonOpacity, 1.0 * moonOpacity);
        
        // Update the time state with calculated values - modify existing object instead of creating a new one
        this.timeState.worldTime = worldTime;
        this.timeState.normalizedTime = normalizedTime;
        this.timeState.dayFactor = dayFactor;
        this.timeState.nightFactor = nightFactor;
        this.timeState.dawnFactor = dawnFactor;
        this.timeState.duskFactor = duskFactor;
        this.timeState.starVisibility = starVisibility;
        this.timeState.sunVisibility = sunVisibility;
        this.timeState.moonOpacity = moonOpacity;
        this.timeState.sunHeight = sunY;
        this.timeState.moonHeight = -sunY;
        this.timeState.sunIntensity = sunIntensity;
        this.timeState.moonIntensity = moonIntensity;
        this.timeState.continuousRotation = this.timeService.getContinuousRotation();
        
        // Update the pre-allocated celestial positions object for GetCelestialPositions
        this._celestialPositions.worldTime = worldTime;
        this._celestialPositions.normalizedTime = normalizedTime;
        this._celestialPositions.sunHeight = sunY;
        this._celestialPositions.moonHeight = -sunY;
        this._celestialPositions.isDay = dayFactor > 0.5;
        this._celestialPositions.isNight = nightFactor > 0.5;
        this._celestialPositions.isDawn = dawnFactor > 0.5;
        this._celestialPositions.isDusk = duskFactor > 0.5;
        this._celestialPositions.dayFactor = dayFactor;
        this._celestialPositions.nightFactor = nightFactor;
        this._celestialPositions.dawnFactor = dawnFactor;
        this._celestialPositions.duskFactor = duskFactor;
        this._celestialPositions.sunVisibility = sunVisibility;
        this._celestialPositions.moonOpacity = moonOpacity;
        this._celestialPositions.starVisibility = starVisibility;
        this._celestialPositions.sunIntensity = sunIntensity;
        this._celestialPositions.moonIntensity = moonIntensity;
        
        // Notify observers about the updated state
        this.timeStateSubject.next(this.timeState);
    }
    
    // Returns the current time state
    getTimeState(): TimeState {
        return this.timeState;
    }
    
    // Observable for the time state, notifies subscribers when state updates
    observeTimeState(): Observable<TimeState> {
        return this.timeStateSubject.asObservable();
    }
    
    // Gets celestial positions for the current world time (kept for backward compatibility)
    // Now returns a pre-allocated object instead of creating a new one each time
    getCelestialPositions() {
        return this._celestialPositions;
    }
    
    isNight(): boolean { return this.timeState.nightFactor > 0.5; }
    isDay(): boolean { return this.timeState.dayFactor > 0.5; }
    isDawn(): boolean { return this.timeState.dawnFactor > 0.5; }
    isDusk(): boolean { return this.timeState.duskFactor > 0.5; }
    
    // Returns sun color based on time of day using reference Color3 for better performance
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
}