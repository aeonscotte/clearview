import { Injectable } from '@angular/core';
import { Scene, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';

@Injectable({
  providedIn: 'root'
})

export class AtmosphereService {
    constructor(private timeService: TimeService) {}

    setup(scene: Scene): void {
        scene.fogMode = Scene.FOGMODE_EXP;
        scene.fogStart = 20.0;
        scene.fogEnd = 100.0;
        scene.fogDensity = 0.001;
        scene.fogColor = new Color3(0.5, 0.5, 0.5); // Initial placeholder
        scene.ambientColor = new Color3(0.2, 0.2, 0.2); // Initial placeholder
    }

    update(scene: Scene): void {
        const worldTime = this.timeService.getWorldTime(); // 0 - 24
        const t = (worldTime % 24) / 24; // Normalize to 0..1

        // Simulate sun height via sine wave
        const sunFactor = Math.max(0.0, Math.sin(t * 2.0 * Math.PI));

        // Fog color transitions from night to day
        const dayFog = new Color3(0.8, 0.9, 1.0);   // Light blue fog (morning/noon)
        const nightFog = new Color3(0.05, 0.05, 0.1); // Dark blue fog (night)

        const fogColor = Color3.Lerp(nightFog, dayFog, sunFactor);
        scene.fogColor = fogColor;

        // Add pulsing effect (slow sine wave for breathing)
        const fogPulse = 0.005 * Math.sin(this.timeService.getElapsed() * 0.5);
        scene.fogDensity = 0.02 - (sunFactor * 0.012) + fogPulse;

        // Ambient light color based on sun/moon blend
        const dayAmbient = new Color3(0.6, 0.6, 0.6);
        const nightAmbient = new Color3(0.1, 0.1, 0.2);
        scene.ambientColor = Color3.Lerp(nightAmbient, dayAmbient, sunFactor);
    }
}

