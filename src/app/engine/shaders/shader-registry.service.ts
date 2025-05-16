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
    
    // Cache for shader names array to avoid recreating it
    private _shaderNamesCache: string[] = [];
    private _shaderNamesCacheDirty = true;
    
    // Reusable error message buffer
    private _errorMessagePrefix = 'Failed to register shader "';

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
            
            // Mark the cache as dirty since we added a new shader
            this._shaderNamesCacheDirty = true;
            
            return true;
        } catch (error) {
            if (options.logErrors) {
                // Use string concatenation instead of template literals to reduce allocations
                console.error(this._errorMessagePrefix + name + '":', error);
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
        // Only recreate the array if it's dirty
        if (this._shaderNamesCacheDirty) {
            this._shaderNamesCache = Array.from(this.registeredShaders);
            this._shaderNamesCacheDirty = false;
        }
        
        return this._shaderNamesCache;
    }

    // Unregisters a shader - primarily for testing/cleanup
    unregisterShader(name: string): boolean {
        if (!this.isShaderRegistered(name)) {
            return false;
        }
        
        // Remove from tracking
        this.registeredShaders.delete(name);
        
        // Mark cache as dirty
        this._shaderNamesCacheDirty = true;
        
        // Remove from BabylonJS store if exists
        delete Effect.ShadersStore[`${name}VertexShader`];
        delete Effect.ShadersStore[`${name}FragmentShader`];
        
        return true;
    }
    
    // Get count of registered shaders - efficient alternative to array creation
    getShaderCount(): number {
        return this.registeredShaders.size;
    }
}