// src/app/engine/material/material.service.ts
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Injectable } from '@angular/core';

export interface PBRMaterialOptions {
    name?: string;
    albedoTextureUrl?: string;
    normalTextureUrl?: string;
    metallicTextureUrl?: string;
    roughness?: number;
    metallic?: number;
}

export interface BasicTextureOptions {
    name?: string;
    textureUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
    // Material cache for reuse
    private _materialCache: Map<string, PBRMaterial | StandardMaterial> = new Map();
    
    // Texture cache for reuse
    private _textureCache: Map<string, Texture> = new Map();
    
    // Get a cached texture or create a new one
    private getOrCreateTexture(url: string, scene: Scene): Texture {
        if (this._textureCache.has(url)) {
            return this._textureCache.get(url)!;
        }
        
        const texture = new Texture(url, scene);
        this._textureCache.set(url, texture);
        return texture;
    }
    
    // Get a cached material or create a new one
    private getOrCreatePBRMaterial(name: string, scene: Scene): PBRMaterial {
        const cacheKey = `pbr:${name}`;
        
        if (this._materialCache.has(cacheKey)) {
            return this._materialCache.get(cacheKey) as PBRMaterial;
        }
        
        const material = new PBRMaterial(name, scene);
        this._materialCache.set(cacheKey, material);
        return material;
    }
    
    // Get a cached standard material or create a new one
    private getOrCreateStandardMaterial(name: string, scene: Scene): StandardMaterial {
        const cacheKey = `std:${name}`;
        
        if (this._materialCache.has(cacheKey)) {
            return this._materialCache.get(cacheKey) as StandardMaterial;
        }
        
        const material = new StandardMaterial(name, scene);
        this._materialCache.set(cacheKey, material);
        return material;
    }

    applyPBRMaterial(scene: Scene, mesh: Mesh, options: PBRMaterialOptions): void {
        const {
            name = 'pbr-material',
            albedoTextureUrl,
            normalTextureUrl,
            metallicTextureUrl,
            roughness = 1,
            metallic = 0.5,
        } = options;

        // Get or create material instead of always creating new
        const material = this.getOrCreatePBRMaterial(name, scene);

        // Apply textures if provided
        if (albedoTextureUrl) {
            material.albedoTexture = this.getOrCreateTexture(albedoTextureUrl, scene);
        }
        if (normalTextureUrl) {
            material.bumpTexture = this.getOrCreateTexture(normalTextureUrl, scene);
        }
        if (metallicTextureUrl) {
            material.metallicTexture = this.getOrCreateTexture(metallicTextureUrl, scene);
        }

        // Apply material properties
        material.roughness = roughness;
        material.metallic = metallic;

        mesh.material = material;
    }

    applyBasicTexture(scene: Scene, mesh: Mesh, options: BasicTextureOptions): void {
        const {
            name = 'basic-texture-material',
            textureUrl,
        } = options;

        // Get or create material
        const material = this.getOrCreateStandardMaterial(name, scene);
        material.diffuseTexture = this.getOrCreateTexture(textureUrl, scene);
        mesh.material = material;
    }

   createGroundMaterial(materialUrl: string, tileSize: number, scene: Scene): PBRMaterial {
        // Use a unique cache key for this ground material
        const cacheKey = `ground:${materialUrl}:${tileSize}`;
        
        if (this._materialCache.has(cacheKey)) {
            return this._materialCache.get(cacheKey) as PBRMaterial;
        }
        
        // If not cached, create new textures and material
        const albedoTexUrl = `${materialUrl}albedo.png`;
        const normHeightTexUrl = `${materialUrl}normalHeight.png`;
        const aoTexUrl = `${materialUrl}ao.png`;
        const metalRoughTexUrl = `${materialUrl}metalRough.png`;
        
        // Get or create textures - pass scene object
        const albedoTex = this.getOrCreateTexture(albedoTexUrl, scene);
        const normHeightTex = this.getOrCreateTexture(normHeightTexUrl, scene);
        const aoTex = this.getOrCreateTexture(aoTexUrl, scene);
        const metalRoughTex = this.getOrCreateTexture(metalRoughTexUrl, scene);
    
        // Set texture tiling
        [albedoTex, normHeightTex, aoTex, metalRoughTex].forEach(tex => {
            tex.uScale = tileSize;
            tex.vScale = tileSize;
        });
    
        // Create the material
        const material = new PBRMaterial("groundMaterial", scene);
    
        material.albedoTexture = albedoTex;
        material.bumpTexture = normHeightTex;
        material.useParallax = true;
        material.useParallaxOcclusion = true;
        material.parallaxScaleBias = 0.03;
        material.metallicTexture = metalRoughTex;
        material.useRoughnessFromMetallicTextureAlpha = true;
        material.ambientTexture = aoTex;
        material.ambientTextureStrength = 0.3;
        material.bumpTexture.level = 0.5;
        
        // Cache the material for future reuse
        this._materialCache.set(cacheKey, material);
    
        return material;
    }
    
    // Clear material and texture caches when no longer needed
    clearCache(): void {
        this._materialCache.clear();
        this._textureCache.clear();
    }
    
    // Remove specific material from cache
    removeMaterialFromCache(name: string): void {
        const pbrKey = `pbr:${name}`;
        const stdKey = `std:${name}`;
        
        this._materialCache.delete(pbrKey);
        this._materialCache.delete(stdKey);
    }
}