// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideZoneChangeDetection } from '@angular/core';
import { ENVIRONMENT_INITIALIZER } from '@angular/core';
import { Effect } from '@babylonjs/core';

import { routes } from './app.routes';
import { Scene001 } from './engine/scenes/scene001.scene';
import { vertexShader as skyVertexShader } from './engine/shaders/enhancedSky.vertex';
import { fragmentShader as skyFragmentShader } from './engine/shaders/enhancedSky.fragment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    Scene001,
    
    // Register shaders at application startup
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => () => {
        // Register enhancedSky shader
        Effect.ShadersStore['enhancedSkyVertexShader'] = skyVertexShader;
        Effect.ShadersStore['enhancedSkyFragmentShader'] = skyFragmentShader;
        
        // Register additional shaders as your application grows
        // Effect.ShadersStore['waterVertexShader'] = waterVertexShader;
        // Effect.ShadersStore['waterFragmentShader'] = waterFragmentShader;
      }
    }
  ]
};