// src/app/engine/utils/math-utils.service.ts
import { Injectable } from '@angular/core';
import { Color3, Vector3 } from '@babylonjs/core/Maths/math';

@Injectable({ providedIn: 'root' })
export class MathUtils {
  private _tempColor3 = new Color3();
  
  lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  bellCurve(x: number, center: number, width: number): number {
    if (center < 6 && x > 18) x -= 24;
    if (center > 18 && x < 6) x += 24;
    const normalized = (x - center) / width;
    return Math.max(0, 1 - normalized * normalized);
  }

  smootherstep(edge0: number, edge1: number, x: number): number {
    if (edge0 > edge1 && x < edge0 && x < edge1) {
      x += 24;
    }
    x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  getNightFactor(time: number, sunrise: number, sunset: number): number {
    const dayStart = sunrise - 0.5;
    const dayEnd = sunset + 0.5;
    let wrappedTime = time;
    
    if (sunset < sunrise && time < sunrise) wrappedTime += 24;
    
    if (wrappedTime >= dayStart && wrappedTime <= sunrise + 1) {
      return 1 - this.smootherstep(dayStart, sunrise + 1, wrappedTime);
    }
    else if (wrappedTime >= sunset - 1 && wrappedTime <= dayEnd) {
      return this.smootherstep(sunset - 1, dayEnd, wrappedTime);
    }
    else if (wrappedTime > dayEnd || wrappedTime < dayStart) {
      return 1;
    }
    return 0;
  }
}