import { Injectable } from '@angular/core';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';

@Injectable({
  providedIn: 'root'
})
export class MemoryUtilsService {
    private _tempVectorA = new Vector3();
    private _tempVectorB = new Vector3();
    private _tempColorA = new Color3();

    getTempVector3(): Vector3 {
        return this._tempVectorA;
    }

    getTempVector3B(): Vector3 {
        return this._tempVectorB;
    }

    lerpColors(color1: Color3, color2: Color3, amount: number): Color3 {
        Color3.LerpToRef(color1, color2, amount, this._tempColorA);
        return this._tempColorA;
    }
}
