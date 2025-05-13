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
  private transitionSpeed: number = 0.005; // Faster transitions
  private rainSystem: ParticleSystem | null = null;
  private snowSystem: ParticleSystem | null = null;
  private fogMultiplier: number = 1;
  
  constructor(
    private timeService: TimeService,
    private atmosphereService: AtmosphereService
  ) {}

  setup(scene: Scene): void {
    this.setupRainSystem(scene);
    this.setupSnowSystem(scene);
    this.setWeather('clear');
  }

  private setupRainSystem(scene: Scene): void {
    this.rainSystem = new ParticleSystem('rain', 8000, scene); // More particles
    const rainTexture = new Texture('/assets/textures/rainDrop.png', scene);
    
    this.rainSystem.particleTexture = rainTexture;
    this.rainSystem.emitter = new Vector3(0, 100, 0);
    this.rainSystem.minEmitBox = new Vector3(-150, 0, -150); // Wider area
    this.rainSystem.maxEmitBox = new Vector3(150, 0, 150);
    
    this.rainSystem.minLifeTime = 0.5;
    this.rainSystem.maxLifeTime = 2.0;
    this.rainSystem.emitRate = 0;
    this.rainSystem.direction1 = new Vector3(-1, -10, -1); // More horizontal variation for wind effect
    this.rainSystem.direction2 = new Vector3(1, -12, 1);
    this.rainSystem.minSize = 0.08;
    this.rainSystem.maxSize = 0.25;
    this.rainSystem.gravity = new Vector3(0, -9.81, 0);
    
    // Make rain streaks with velocity factors
    this.rainSystem.addVelocityGradient(0, 0.7);
    this.rainSystem.addVelocityGradient(1.0, 0.9);
    
    // Start with invisible rain drops that fade in
    this.rainSystem.addColorGradient(0, new Color4(0.6, 0.6, 0.8, 0));
    this.rainSystem.addColorGradient(0.1, new Color4(0.6, 0.6, 0.8, 0.2));
    this.rainSystem.addColorGradient(0.8, new Color4(0.7, 0.7, 0.9, 0.2));
    this.rainSystem.addColorGradient(1.0, new Color4(0.7, 0.7, 0.9, 0));
    
    this.rainSystem.start();
  }

  private setupSnowSystem(scene: Scene): void {
    this.snowSystem = new ParticleSystem('snow', 5000, scene);
    const snowTexture = new Texture('/assets/textures/snowflake.png', scene);
    
    this.snowSystem.particleTexture = snowTexture;
    this.snowSystem.emitter = new Vector3(0, 100, 0);
    this.snowSystem.minEmitBox = new Vector3(-200, 0, -200);
    this.snowSystem.maxEmitBox = new Vector3(200, 0, 200);
    
    this.snowSystem.minLifeTime = 5.0;
    this.snowSystem.maxLifeTime = 12.0;
    this.snowSystem.emitRate = 0;
    
    // More realistic snow movement
    this.snowSystem.direction1 = new Vector3(-2, -3, -2); // More horizontal variation
    this.snowSystem.direction2 = new Vector3(2, -5, 2);
    this.snowSystem.minSize = 0.1;
    this.snowSystem.maxSize = 0.5;
    this.snowSystem.gravity = new Vector3(0, -0.4, 0); // Lighter gravity for snow
    
    // Add swirling motion to snowflakes
    this.snowSystem.updateFunction = (particles) => {
        for (let p = 0; p < particles.length; p++) {
            const particle = particles[p];
            // Add gentle swirling motion
            const swirl = 0.05 * Math.sin(this.timeService.getElapsed() * 0.5 + particle.age * 2.0);
            particle.direction.x += swirl;
            particle.direction.z += swirl * 0.7;
        }
    };
    
    // Snowflake appearance
    this.snowSystem.addColorGradient(0, new Color4(1, 1, 1, 0));
    this.snowSystem.addColorGradient(0.1, new Color4(0.95, 0.95, 1, 0.7));
    this.snowSystem.addColorGradient(0.8, new Color4(0.9, 0.9, 0.95, 0.5));
    this.snowSystem.addColorGradient(1.0, new Color4(0.9, 0.9, 0.9, 0));
    
    // Add size variation over lifetime (snowflakes melt as they fall)
    this.snowSystem.addSizeGradient(0, 1.0);
    this.snowSystem.addSizeGradient(0.7, 0.8);
    this.snowSystem.addSizeGradient(1.0, 0.5);
    
    this.snowSystem.start();
  }

  setWeather(weatherType: 'clear' | 'rain' | 'snow' | 'fog' | 'overcast', intensity?: number): void {
    this.currentWeather = weatherType;
    
    if (intensity !== undefined) {
      this.targetIntensity = Math.max(0, Math.min(1, intensity));
    } else {
      this.targetIntensity = 0.5;
    }
  }

  update(scene: Scene): void {
    // Smooth transition to target intensity
    if (this.weatherIntensity < this.targetIntensity) {
      this.weatherIntensity = Math.min(this.targetIntensity, this.weatherIntensity + this.transitionSpeed);
    } else if (this.weatherIntensity > this.targetIntensity) {
      this.weatherIntensity = Math.max(this.targetIntensity, this.weatherIntensity - this.transitionSpeed);
    }

    // Get current time of day for lighting adjustments
    const worldTime = this.timeService.getWorldTime();
    const dayTime = (worldTime % 24) / 24;
    const sunAngle = dayTime * 2.0 * Math.PI;
    const sunHeight = Math.sin(sunAngle);
    
    // Day/night factor (1.0 = full day, 0.0 = full night)
    const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.2) * 1.5));
    
    // Weather-specific updates
    switch (this.currentWeather) {
      case 'rain':
        if (this.rainSystem) {
          // Scale emission rate with intensity
          this.rainSystem.emitRate = 2000 * this.weatherIntensity;
          
          // Rain is darker at night
          const rainColor = new Color4(
            0.5 * dayFactor + 0.1, 
            0.5 * dayFactor + 0.1, 
            0.7 * dayFactor + 0.2,
            0.2 + (0.1 * this.weatherIntensity)
          );
          
          const rainColorEnd = new Color4(
            rainColor.r,
            rainColor.g,
            rainColor.b,
            0
          );
          
          // Remove all color gradients (Babylon.js does not provide removeAllColorGradients, so remove by value)
          if (this.rainSystem['_colorGradients']) {
            const gradients = [...this.rainSystem['_colorGradients']];
            for (const grad of gradients) {
              this.rainSystem.removeColorGradient(grad.gradient);
            }
          }
          // Update rain colors for day/night
          this.rainSystem.addColorGradient(0, new Color4(rainColor.r, rainColor.g, rainColor.b, 0));
          this.rainSystem.addColorGradient(0.1, rainColor);
          this.rainSystem.addColorGradient(0.8, rainColor);
          this.rainSystem.addColorGradient(1.0, rainColorEnd);
          
          // Make rain more dramatic during storms
          if (this.weatherIntensity > 0.7) {
            this.rainSystem.direction1 = new Vector3(-1.5, -12, -1.5);
            this.rainSystem.direction2 = new Vector3(1.5, -15, 1.5);
            this.rainSystem.minSize = 0.12;
            this.rainSystem.maxSize = 0.3;
          } else {
            this.rainSystem.direction1 = new Vector3(-0.5, -10, -0.5);
            this.rainSystem.direction2 = new Vector3(0.5, -12, 0.5);
            this.rainSystem.minSize = 0.08;
            this.rainSystem.maxSize = 0.25;
          }
        }
        if (this.snowSystem) this.snowSystem.emitRate = 0;
        this.fogMultiplier = 1 + (this.weatherIntensity * 3.0);
        break;
        
      case 'snow':
        if (this.snowSystem) {
          this.snowSystem.emitRate = 500 * this.weatherIntensity;
          
          // Snow is bluer at night
          const snowColor = new Color4(
            0.9 * dayFactor + 0.1,
            0.9 * dayFactor + 0.1,
            1.0 * dayFactor + 0.2,
            0.7
          );
          
          // Update snow colors for day/night
          // Remove all color gradients (Babylon.js does not provide removeAllColorGradients, so remove by value)
          if (this.snowSystem['_colorGradients']) {
            const gradients = [...this.snowSystem['_colorGradients']];
            for (const grad of gradients) {
              this.snowSystem.removeColorGradient(grad.gradient);
            }
          }
          this.snowSystem.addColorGradient(0, new Color4(snowColor.r, snowColor.g, snowColor.b, 0));
          this.snowSystem.addColorGradient(0.1, snowColor);
          this.snowSystem.addColorGradient(0.8, snowColor);
          this.snowSystem.addColorGradient(1.0, new Color4(snowColor.r, snowColor.g, snowColor.b, 0));
        }
        if (this.rainSystem) this.rainSystem.emitRate = 0;
        this.fogMultiplier = 1 + (this.weatherIntensity * 2.0);
        break;
        
      case 'fog':
        if (this.rainSystem) this.rainSystem.emitRate = 0;
        if (this.snowSystem) this.snowSystem.emitRate = 0;
        this.fogMultiplier = 1 + (this.weatherIntensity * 6.0);
        break;
        
      case 'overcast':
        if (this.rainSystem) this.rainSystem.emitRate = 0;
        if (this.snowSystem) this.snowSystem.emitRate = 0;
        this.fogMultiplier = 1 + (this.weatherIntensity * 1.5);
        break;
        
      case 'clear':
      default:
        if (this.rainSystem) this.rainSystem.emitRate = 0;
        if (this.snowSystem) this.snowSystem.emitRate = 0;
        this.fogMultiplier = 1;
        break;
    }

    // Apply fog changes
    if (scene.fogMode !== Scene.FOGMODE_NONE) {
      scene.fogDensity *= this.fogMultiplier;
    }

    // Weather particles follow camera
    const camera = scene.activeCamera;
    if (camera) {
      const pos = camera.position;
      
      if (this.rainSystem) {
        this.rainSystem.emitter = new Vector3(pos.x, pos.y + 100, pos.z);
        this.rainSystem.minEmitBox = new Vector3(-150, 0, -150);
        this.rainSystem.maxEmitBox = new Vector3(150, 0, 150);
      }
      
      if (this.snowSystem) {
        this.snowSystem.emitter = new Vector3(pos.x, pos.y + 100, pos.z);
        this.snowSystem.minEmitBox = new Vector3(-200, 0, -200);
        this.snowSystem.maxEmitBox = new Vector3(200, 0, 200);
      }
    }
  }

  getWeatherStatus(): { type: string, intensity: number } {
    return {
      type: this.currentWeather,
      intensity: this.weatherIntensity
    };
  }
  
  // Add a specific overcast weather type
  setOvercast(intensity: number = 0.5): void {
    this.setWeather('overcast', intensity);
  }
  
  // Add weather cycles for dynamic environments
  randomizeWeather(chance: number = 0.005): void {
    if (Math.random() < chance) {
      const weatherTypes = ['clear', 'rain', 'snow', 'fog', 'overcast'] as const;
      const randomType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      const randomIntensity = Math.random() * 0.7 + 0.3; // Between 0.3 and 1.0
      this.setWeather(randomType, randomIntensity);
    }
  }
  
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