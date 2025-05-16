// src/app/engine/core/asset-manager.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Material } from '@babylonjs/core/Materials/material';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AssetManagerService {
    // Cache collections with scene ID as part of the key
    private textureCache = new Map<string, Texture>();
    private materialCache = new Map<string, Material>();

    // Track loading status
    private loadingCount = 0;
    private loadingSubject = new BehaviorSubject<number>(0);

    getTexture(url: string, scene: Scene): Texture {
        const sceneId = scene.uid || 'default';
        const cacheKey = `texture:${url}:${sceneId}`;

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        // Track loading
        this.incrementLoading();

        const texture = new Texture(url, scene);

        // Set up loading completion callback
        texture.onLoadObservable.addOnce(() => this.decrementLoading());

        // Cache the texture
        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    getMaterial(key: string, scene: Scene): Material | null {
        const sceneId = scene.uid || 'default';
        const cacheKey = `material:${key}:${sceneId}`;

        return this.materialCache.get(cacheKey) || null;
    }

    registerMaterial(material: Material, key: string, scene: Scene): void {
        const sceneId = scene.uid || 'default';
        const cacheKey = `material:${key}:${sceneId}`;

        this.materialCache.set(cacheKey, material);
    }

    // Clean up resources when a scene is disposed
    handleSceneDisposal(scene: Scene): void {
        const sceneId = scene.uid || 'default';

        // Clear all cached assets for this scene
        for (const [key, _] of this.textureCache.entries()) {
            if (key.includes(`:${sceneId}`)) {
                this.textureCache.delete(key);
            }
        }

        for (const [key, _] of this.materialCache.entries()) {
            if (key.includes(`:${sceneId}`)) {
                this.materialCache.delete(key);
            }
        }
    }

    // Loading progress tracking
    private incrementLoading(): void {
        this.loadingCount++;
        this.loadingSubject.next(this.calculateProgress());
    }

    private decrementLoading(): void {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        this.loadingSubject.next(this.calculateProgress());
    }

    private calculateProgress(): number {
        return this.loadingCount === 0 ? 1.0 : 0.5;
    }

    getLoadingProgress(): Observable<number> {
        return this.loadingSubject.asObservable();
    }

    isLoading(): boolean {
        return this.loadingCount > 0;
    }

    // Preload textures
    preloadTextures(urls: string[], scene: Scene): Promise<void> {
        const promises = urls.map(url => {
            const texture = this.getTexture(url, scene);

            return new Promise<void>((resolve) => {
                if (texture.isReady()) {
                    resolve();
                    return;
                }

                texture.onLoadObservable.addOnce(() => resolve());
            });
        });

        return Promise.all(promises).then(() => { });
    }
}