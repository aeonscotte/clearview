// src/app/app.config.ts
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideZoneChangeDetection } from '@angular/core';

import { routes } from './app.routes';
import { Scene001 } from './engine/scenes/scene001.scene';
import { ShaderRegistryService } from './engine/shaders/shader-registry.service';

// Import all shader code
import { vertexShader as skyVertexShader } from './engine/shaders/enhancedSky.vertex';
import { fragmentShader as skyFragmentShader } from './engine/shaders/enhancedSky.fragment';
// Import additional shaders as your application grows

/**
 * Factory function for pre-registering all shaders during app initialization
 */
function initializeShaders(shaderRegistry: ShaderRegistryService) {
  return () => {
    // Register all shaders used in the application
    shaderRegistry.registerShader('enhancedSky', skyVertexShader, skyFragmentShader);
    
    // Register additional shaders as needed
    // For example:
    // shaderRegistry.registerShader('water', waterVertexShader, waterFragmentShader);
    // shaderRegistry.registerShader('terrain', terrainVertexShader, terrainFragmentShader);
    
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    Scene001,
    
    // Add ShaderRegistryService explicitly (though @Injectable({providedIn: 'root'}) means this isn't strictly necessary)
    ShaderRegistryService,
    
    // Pre-register all shaders at application startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializeShaders,
      deps: [ShaderRegistryService],
      multi: true
    }
  ]
};