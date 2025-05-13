// src/app/engine/world/weather.service.ts
import { Injectable } from '@angular/core';
import { Scene, ParticleSystem, Texture, Vector3, Color4 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { AtmosphereService } from './atmosphere.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private currentWeather: string = 'clear';
  private weatherIntensity: number = 0;
  private targetIntensity: number = 0;
  private transitionSpeed: number = 0.01;
  private rainSystem: ParticleSystem | null = null;
  private snowSystem: ParticleSystem | null = null;
  private fogMultiplier: number = 1;
  
  constructor(
    private timeService: TimeService,
    private atmosphereService: AtmosphereService
  ) {}

  setup(scene: Scene): void {
    // Initialize particle systems but keep them invisible
    this.setupRainSystem(scene);
    this.setupSnowSystem(scene);
    
    // Start with clear weather
    this.setWeather('clear');
  }

  private setupRainSystem(scene: Scene): void {
    this.rainSystem = new ParticleSystem('rain', 5000, scene);
    const rainTexture = new Texture('/assets/textures/rainDrop.png', scene);
    
    // Set particle texture
    this.rainSystem.particleTexture = rainTexture;
    
    // Where the particles come from
    this.rainSystem.emitter = new Vector3(0, 100, 0); // Start high above
    this.rainSystem.minEmitBox = new Vector3(-100, 0, -100);
    this.rainSystem.maxEmitBox = new Vector3(100, 0, 100);
    
    // Particle behavior
    this.rainSystem.minLifeTime = 1.0;
    this.rainSystem.maxLifeTime = 2.0;
    this.rainSystem.emitRate = 0; // Start with no emission
    this.rainSystem.direction1 = new Vector3(-0.5, -10, -0.5);
    this.rainSystem.direction2 = new Vector3(0.5, -10, 0.5);
    this.rainSystem.minSize = 0.1;
    this.rainSystem.maxSize = 0.3;
    this.rainSystem.gravity = new Vector3(0, -9.81, 0);
    
    // Colors
    this.rainSystem.color1 = new Color4(0.6, 0.6, 0.8, 0.2);
    this.rainSystem.color2 = new Color4(0.7, 0.7, 0.9, 0.3);
    this.rainSystem.colorDead = new Color4(0.7, 0.7, 0.9, 0);
    
    // Start the system
    this.rainSystem.start();
  }

  private setupSnowSystem(scene: Scene): void {
    this.snowSystem = new ParticleSystem('snow', 3000, scene);
    const snowTexture = new Texture('/assets/textures/snowflake.png', scene);
    
    this.snowSystem.particleTexture = snowTexture;
    
    // Where the particles come from
    this.snowSystem.emitter = new Vector3(0, 100, 0);
    this.snowSystem.minEmitBox = new Vector3(-150, 0, -150);
    this.snowSystem.maxEmitBox = new Vector3(150, 0, 150);
    
    // Particle behavior
    this.snowSystem.minLifeTime = 5.0;
    this.snowSystem.maxLifeTime = 10.0;
    this.snowSystem.emitRate = 0; // Start with no emission
    this.snowSystem.minEmitPower = 0.5;
    this.snowSystem.maxEmitPower = 1.5;
    this.snowSystem.direction1 = new Vector3(-1, -3, -1);
    this.snowSystem.direction2 = new Vector3(1, -5, 1);
    this.snowSystem.minSize = 0.1;
    this.snowSystem.maxSize = 0.5;
    this.snowSystem.gravity = new Vector3(0, -0.5, 0);
    
    // Add some swirl to the snowflakes
    this.snowSystem.startDirectionFunction = (worldMatrix, directionToUpdate) => {
      const randX = (Math.random() * 2 - 1) * 0.5;
      const randZ = (Math.random() * 2 - 1) * 0.5;
      directionToUpdate.x += randX;
      directionToUpdate.z += randZ;
    };
    
    // Colors
    this.snowSystem.color1 = new Color4(1, 1, 1, 0.8);
    this.snowSystem.color2 = new Color4(0.95, 0.95, 1, 0.9);
    this.snowSystem.colorDead = new Color4(0.9, 0.9, 0.9, 0);
    
    // Start the system
    this.snowSystem.start();
  }

  setWeather(weatherType: 'clear' | 'rain' | 'snow' | 'fog', intensity?: number): void {
    this.currentWeather = weatherType;
    
    if (intensity !== undefined) {
      this.targetIntensity = Math.max(0, Math.min(1, intensity));
    } else {
      // Default medium intensity if not specified
      this.targetIntensity = 0.5;
    }
  }

  update(scene: Scene): void {
    // Gradually transition to target intensity
    if (this.weatherIntensity < this.targetIntensity) {
      this.weatherIntensity = Math.min(this.targetIntensity, this.weatherIntensity + this.transitionSpeed);
    } else if (this.weatherIntensity > this.targetIntensity) {
      this.weatherIntensity = Math.max(this.targetIntensity, this.weatherIntensity - this.transitionSpeed);
    }

    // Update particle systems based on weather type and intensity
    switch (this.currentWeather) {
      case 'rain':
        if (this.rainSystem) {
          this.rainSystem.emitRate = 1000 * this.weatherIntensity;
          
          // Make rain more intense and faster during storms
          if (this.weatherIntensity > 0.7) {
            this.rainSystem.direction1 = new Vector3(-1, -12, -1);
            this.rainSystem.direction2 = new Vector3(1, -15, 1);
          } else {
            this.rainSystem.direction1 = new Vector3(-0.3, -10, -0.3);
            this.rainSystem.direction2 = new Vector3(0.3, -12, 0.3);
          }
        }
        if (this.snowSystem) this.snowSystem.emitRate = 0;
        this.fogMultiplier = 1 + this.weatherIntensity * 2; // Increase fog during rain
        break;
        
      case 'snow':
        if (this.snowSystem) this.snowSystem.emitRate = 300 * this.weatherIntensity;
        if (this.rainSystem) this.rainSystem.emitRate = 0;
        this.fogMultiplier = 1 + this.weatherIntensity * 1.5; // More fog during snow
        break;
        
      case 'fog':
        if (this.rainSystem) this.rainSystem.emitRate = 0;
        if (this.snowSystem) this.snowSystem.emitRate = 0;
        this.fogMultiplier = 1 + this.weatherIntensity * 5; // Heavy fog
        break;
        
      case 'clear':
      default:
        if (this.rainSystem) this.rainSystem.emitRate = 0;
        if (this.snowSystem) this.snowSystem.emitRate = 0;
        this.fogMultiplier = 1; // Normal fog
        break;
    }

    // Modify the scene's fog density based on weather
    if (scene.fogMode !== Scene.FOGMODE_NONE) {
      scene.fogDensity *= this.fogMultiplier;
    }

    // Make weather follow camera
    const camera = scene.activeCamera;
    if (camera && this.rainSystem) {
      const pos = camera.position;
      this.rainSystem.emitter = new Vector3(pos.x, pos.y + 100, pos.z);
      this.rainSystem.minEmitBox = new Vector3(-100, 0, -100);
      this.rainSystem.maxEmitBox = new Vector3(100, 0, 100);
    }
    
    if (camera && this.snowSystem) {
      const pos = camera.position;
      this.snowSystem.emitter = new Vector3(pos.x, pos.y + 100, pos.z);
      this.snowSystem.minEmitBox = new Vector3(-150, 0, -150);
      this.snowSystem.maxEmitBox = new Vector3(150, 0, 150);
    }
    
    // Time of day effects on weather
    const worldTime = this.timeService.getWorldTime();
    const dayNightCycle = (worldTime % 24) / 24;
    
    // Weather can appear different at different times of day
    if (this.currentWeather === 'rain' && this.rainSystem) {
      // Darker rain at night
      const nightFactor = Math.sin(dayNightCycle * Math.PI * 2) > 0 ? 1 : 0.5;
      this.rainSystem.color1 = new Color4(0.6 * nightFactor, 0.6 * nightFactor, 0.8 * nightFactor, 0.2);
      this.rainSystem.color2 = new Color4(0.7 * nightFactor, 0.7 * nightFactor, 0.9 * nightFactor, 0.3);
    }
  }

  // Method to get current weather status for UI or gameplay mechanics
  getWeatherStatus(): { type: string, intensity: number } {
    return {
      type: this.currentWeather,
      intensity: this.weatherIntensity
    };
  }
  
  // Random weather changes for dynamic environments
  randomizeWeather(chance: number = 0.01): void {
    if (Math.random() < chance) {
      const weatherTypes = ['clear', 'rain', 'snow', 'fog'] as const;
      const randomType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      const randomIntensity = Math.random();
      this.setWeather(randomType, randomIntensity);
    }
  }
  
  // Clean up resources when no longer needed
  dispose(): void {
    if (this.rainSystem) {
      this.rainSystem.dispose();
      this.rainSystem = null;
    }
    
    if (this.snowSystem) {
      this.snowSystem.dispose();
      this.snowSystem = null;
    }
  }
}