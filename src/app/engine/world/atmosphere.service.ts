import { Injectable } from '@angular/core';
import { Scene, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';

@Injectable({
  providedIn: 'root'
})
export class AtmosphereService {
    constructor(private timeService: TimeService) {}

    setup(scene: Scene): void {
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogDensity = 0.001;
        scene.fogColor = new Color3(0.5, 0.5, 0.5); // Initial placeholder
        scene.ambientColor = new Color3(0.2, 0.2, 0.2); // Initial placeholder
    }

    update(scene: Scene): void {
        const worldTime = this.timeService.getWorldTime(); // 0 - 24
        const t = (worldTime % 24) / 24; // Normalize to 0..1
        const elapsed = this.timeService.getElapsed();

        // Simulate sun height
        const sunFactor = Math.max(0.0, Math.sin(t * 2.0 * Math.PI));

        // Interpolate fog color
        const dayFog = new Color3(0.8, 0.9, 1.0);
        const nightFog = new Color3(0.05, 0.05, 0.1);
        scene.fogColor = Color3.Lerp(nightFog, dayFog, sunFactor);

        // Ambient color interpolation
        const dayAmbient = new Color3(0.6, 0.6, 0.6);
        const nightAmbient = new Color3(0.1, 0.1, 0.2);
        scene.ambientColor = Color3.Lerp(nightAmbient, dayAmbient, sunFactor);

        // Fog pulse / drift effect
        const fogPulse = 0.0025 * Math.sin(elapsed * 0.5);

        // Fog density with altitude
        const camera = scene.activeCamera;
        const camY = camera?.position.y ?? 0;
        const altitudeFactor = Math.exp(-camY / 100.0);

        const baseFog = 0.02 - (sunFactor * 0.012);
        scene.fogDensity = Math.max(0.0005, (baseFog + fogPulse) * altitudeFactor);
    }
}
