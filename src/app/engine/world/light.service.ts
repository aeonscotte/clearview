// src/app/engine/world/light.service.ts
import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight, Vector3, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';

export class LightService {
    private sunLight!: DirectionalLight;
    private moonLight!: DirectionalLight;

    constructor(private timeService: TimeService) {}

    createLights(scene: Scene): void {
        // ☀️ Sun light
        this.sunLight = new DirectionalLight("SunLight", new Vector3(0, -1, 0), scene);
        this.sunLight.intensity = 1.0;
        this.sunLight.diffuse = new Color3(1.0, 0.95, 0.8); // warm light
        this.sunLight.shadowEnabled = true;

        // 🌙 Moon light
        this.moonLight = new DirectionalLight("MoonLight", new Vector3(0, -1, 0), scene);
        this.moonLight.intensity = 0.2;
        this.moonLight.diffuse = new Color3(0.6, 0.6, 1.0); // cool blue light
    }

    update(): void {
        const worldTime = this.timeService.getWorldTime(); // 0 - 24
        const angle = (worldTime / 24.0) * 2.0 * Math.PI;  // rotate over a circle

        // ☀️ Sun follows upper half
        const sunDir = new Vector3(
            Math.sin(angle),
            Math.cos(angle),
            0
        ).normalize();

        // 🌙 Moon is opposite
        const moonDir = sunDir.scale(-1);

        // Update directions
        this.sunLight.direction = sunDir.negate(); // light direction is "where it's pointing"
        this.moonLight.direction = moonDir.negate();

        // Fade sun in daytime and moon at night
        const sunFactor = Math.max(0, Math.sin(angle)); // 0 at night, 1 at noon
        const moonFactor = 1.0 - sunFactor;

        this.sunLight.intensity = sunFactor * 1.5; // Brighter at noon
        this.moonLight.intensity = moonFactor * 0.4; // Slightly dimmer moonlight
    }
}

