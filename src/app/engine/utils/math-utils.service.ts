// src/app/engine/utils/math-utils.service.ts
import { Injectable } from '@angular/core';
import { Vector3, Matrix, Quaternion, Color3, Color4 } from '@babylonjs/core/Maths/math';

@Injectable({
  providedIn: 'root'
})
export class MathUtils {
    // Pre-allocated objects for calculations
    private _tempVector3A = new Vector3();
    private _tempVector3B = new Vector3();
    private _tempVector3C = new Vector3();
    private _tempQuaternion = new Quaternion();
    private _tempMatrix = new Matrix();
    private _tempColor3 = new Color3();
    private _tempColor4 = new Color4();
    
    // Radians/degrees conversion constants
    private readonly DEG_TO_RAD = Math.PI / 180;
    private readonly RAD_TO_DEG = 180 / Math.PI;
    
    // ===== Interpolation Methods =====
    
    // Linear interpolation - no allocations
    lerp(start: number, end: number, amount: number): number {
        return start + (end - start) * amount;
    }
    
    // Smoother step interpolation - better for animation curves
    smoothstep(edge0: number, edge1: number, x: number): number {
        // Scale, bias and saturate x to 0..1 range
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        // Evaluate polynomial
        return x * x * (3 - 2 * x);
    }
    
    // Even smoother step with 6th order polynomial
    smootherstep(edge0: number, edge1: number, x: number): number {
        // Scale, bias and saturate x to 0..1 range
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        // Evaluate polynomial
        return x * x * x * (x * (x * 6 - 15) + 10);
    }
    
    // Bell curve function centered at center with specified width
    bellCurve(x: number, center: number, width: number): number {
        const normalized = (x - center) / width;
        return Math.max(0, 1 - normalized * normalized);
    }
    
    // ===== Vector3 Operations =====
    
    // Calculate midpoint between two vectors without creating a new Vector3
    midpoint(a: Vector3, b: Vector3, result: Vector3): Vector3 {
        result.x = (a.x + b.x) * 0.5;
        result.y = (a.y + b.y) * 0.5;
        result.z = (a.z + b.z) * 0.5;
        return result;
    }
    
    // Calculate distance squared - more efficient than distance for comparisons
    distanceSquared(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }
    
    // Reflect a vector around a normal
    reflect(vector: Vector3, normal: Vector3, result: Vector3): Vector3 {
        const dot = 2 * Vector3.Dot(vector, normal);
        result.x = vector.x - normal.x * dot;
        result.y = vector.y - normal.y * dot;
        result.z = vector.z - normal.z * dot;
        return result;
    }
    
    // ===== Color Operations =====
    
    // Blend two colors with amount - memory efficient version
    blendColors(color1: Color3, color2: Color3, amount: number, result: Color3): Color3 {
        result.r = this.lerp(color1.r, color2.r, amount);
        result.g = this.lerp(color1.g, color2.g, amount);
        result.b = this.lerp(color1.b, color2.b, amount);
        return result;
    }
    
    // Convert hex color string to Color3 - reuses pre-allocated color
    hexToColor3(hex: string): Color3 {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        
        // Parse hex to RGB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        this._tempColor3.set(r, g, b);
        return this._tempColor3;
    }
    
    // ===== Time-Based Calculations =====
    
    // Get a smooth night factor based on sunrise/sunset times
    getNightFactor(time: number, sunrise: number, sunset: number): number {
        if (time > sunset || time < sunrise) {
            // If after sunset or before sunrise - night time
            // Handle wrapping around midnight
            if (time > sunset) {
                const midnight = 24;
                return this.smoothstep(sunset, midnight - 1, time);
            } else {
                return this.smoothstep(sunrise, 0, time);
            }
        }
        return 0; // Daytime
    }
    
    // Get day factor - inverse of night factor
    getDayFactor(time: number, sunrise: number, sunset: number): number {
        return 1 - this.getNightFactor(time, sunrise, sunset);
    }
    
    // ===== Utility Methods =====
    
    // Map value from one range to another
    mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
    
    // Clamp value between min and max
    clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
    
    // Convert degrees to radians
    degToRad(degrees: number): number {
        return degrees * this.DEG_TO_RAD;
    }
    
    // Convert radians to degrees
    radToDeg(radians: number): number {
        return radians * this.RAD_TO_DEG;
    }
    
    // Calculate a hash value from a string - useful for deterministic random
    hash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    
    // Generate a deterministic random number from a seed
    seededRandom(seed: number): number {
        // Simple LCG random number generator
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);
        seed = (a * seed + c) % m;
        return seed / m;
    }
    
    // ===== Lending Methods (for other services) =====
    
    // Let other services borrow pre-allocated objects for temporary calculations
    
    // Borrow a temporary Vector3
    getTempVector3(): Vector3 {
        return this._tempVector3A;
    }
    
    // Borrow a second temporary Vector3 if needed
    getTempVector3B(): Vector3 {
        return this._tempVector3B;
    }
    
    // Borrow a third temporary Vector3 if needed
    getTempVector3C(): Vector3 {
        return this._tempVector3C;
    }
    
    // Borrow a temporary Quaternion
    getTempQuaternion(): Quaternion {
        return this._tempQuaternion;
    }
    
    // Borrow a temporary Matrix
    getTempMatrix(): Matrix {
        return this._tempMatrix;
    }
    
    // Borrow a temporary Color3
    getTempColor3(): Color3 {
        return this._tempColor3;
    }
    
    // Borrow a temporary Color4
    getTempColor4(): Color4 {
        return this._tempColor4;
    }
}