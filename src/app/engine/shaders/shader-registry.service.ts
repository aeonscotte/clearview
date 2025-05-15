// src/app/engine/shaders/shader-registry.service.ts
import { Injectable } from '@angular/core';
import { Effect } from '@babylonjs/core';

// Shader compilation error handler options
export interface ShaderErrorHandlingOptions {
    // When true, logs compilation errors to console
    logErrors?: boolean;
    
    // When true, continues execution despite errors
    silentFail?: boolean;
}

// Service responsible for centralized shader registration and management
@Injectable({
  providedIn: 'root'
})
export class ShaderRegistryService {
    // Tracks registered shaders to prevent duplicate compilation
    private registeredShaders = new Set<string>();

    // Default error handling options
    private defaultErrorOptions: ShaderErrorHandlingOptions = {
        logErrors: true,
        silentFail: false
    };

    // Registers a shader if it hasn't already been registered
    // Returns true if newly registered, false if already registered
    // Throws Error if shader compilation fails and silentFail is false
    registerShader(
        name: string, 
        vertexShader: string, 
        fragmentShader: string,
        errorOptions?: ShaderErrorHandlingOptions
    ): boolean {
        // Skip if already registered
        if (this.isShaderRegistered(name)) {
            return false;
        }
        
        const options = { ...this.defaultErrorOptions, ...errorOptions };
        
        try {
            // Register vertex shader
            Effect.ShadersStore[`${name}VertexShader`] = vertexShader;
            
            // Register fragment shader
            Effect.ShadersStore[`${name}FragmentShader`] = fragmentShader;
            
            // Mark as registered
            this.registeredShaders.add(name);
            
            return true;
        } catch (error) {
            if (options.logErrors) {
                console.error(`Failed to register shader "${name}":`, error);
            }
            
            if (!options.silentFail) {
                throw error;
            }
            
            return false;
        }
    }

    // Checks if a shader is already registered
    isShaderRegistered(name: string): boolean {
        return this.registeredShaders.has(name);
    }

    // Gets the list of all registered shader names
    getRegisteredShaderNames(): string[] {
        return Array.from(this.registeredShaders);
    }

    // Unregisters a shader - primarily for testing/cleanup
    unregisterShader(name: string): boolean {
        if (!this.isShaderRegistered(name)) {
            return false;
        }
        
        // Remove from tracking
        this.registeredShaders.delete(name);
        
        // Remove from BabylonJS store if exists
        delete Effect.ShadersStore[`${name}VertexShader`];
        delete Effect.ShadersStore[`${name}FragmentShader`];
        
        return true;
    }
}