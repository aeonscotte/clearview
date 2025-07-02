// src/app/engine/material/material.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { AssetManagerService } from '../../engine/core/asset-manager.service';
import { ShaderMaterial } from '@babylonjs/core';
import { simpleWaterVertex, simpleWaterFragment } from '../../engine/shaders/simpleWater.shader';

@Injectable({ providedIn: 'root' })
export class MaterialService {
    constructor(private assetManager: AssetManagerService) { }

    /**
     * General helper for creating PBR materials from a set of texture URLs.
     * Textures are automatically cached via the AssetManagerService and can be
     * reused across scenes.
     */
    createPbrMaterial(
        materialName: string,
        textureUrls: {
            albedo?: string;
            normal?: string;
            ao?: string;
            metalRough?: string;
            roughness?: string;
        },
        scene: Scene,
        tileSize = 1,
    ): PBRMaterial {
        // Check for cached material
        let material = this.assetManager.getMaterial(materialName, scene) as PBRMaterial;
        if (material) return material;

        try {
            const loadedTextures: any = {};
            const assignTexture = (key: keyof typeof textureUrls) => {
                const url = textureUrls[key];
                if (!url) return undefined;
                const tex = this.assetManager.getTexture(url, scene);
                tex.uScale = tileSize;
                tex.vScale = tileSize;
                loadedTextures[key] = tex;
                return tex;
            };

            // Create the material
            material = new PBRMaterial(materialName, scene);

            const albedo = assignTexture('albedo');
            if (albedo) material.albedoTexture = albedo;

            const normal = assignTexture('normal');
            if (normal) {
                material.bumpTexture = normal;
                material.bumpTexture.level = 0.5;
            }

            const metalRough = assignTexture('metalRough');
            if (metalRough) {
                material.metallicTexture = metalRough;
                material.useRoughnessFromMetallicTextureAlpha = true;
            }

            const roughness = assignTexture('roughness');
            if (roughness) {
                material.metallicTexture = roughness;
                material.useRoughnessFromMetallicTextureAlpha = false;
            }

            const ao = assignTexture('ao');
            if (ao) {
                material.ambientTexture = ao;
                material.ambientTextureStrength = 0.3;
            }

            material.maxSimultaneousLights = 8;

            // Register the material
            this.assetManager.registerMaterial(material, materialName, scene);

            return material;
        } catch (error) {
            console.error('Error creating PBR material:', error);

            const fallback = new PBRMaterial('fallback-material', scene);
            fallback.albedoColor = new Color3(1, 0, 1);
            return fallback;
        }
    }

    createGroundMaterial(materialUrl: string, tileSize: number, scene: Scene): PBRMaterial {
        const materialName = `ground-${materialUrl.replace(/\//g, '-')}-${tileSize}`;

        const material = this.createPbrMaterial(
            materialName,
            {
                albedo: `${materialUrl}albedo.png`,
                normal: `${materialUrl}normalHeight.png`,
                ao: `${materialUrl}ao.png`,
                metalRough: `${materialUrl}metalRough.png`,
            },
            scene,
            tileSize
        );

        // Apply ground specific settings
        material.useParallax = true;
        material.useParallaxOcclusion = true;
        material.parallaxScaleBias = 0.03;
        if (material.bumpTexture) {
            material.bumpTexture.level = 0.5;
        }

        return material;
    }

    createWaterMaterial(scene: Scene): ShaderMaterial {
        const shaderName = 'simpleWaterShader';

        const material = new ShaderMaterial(
            shaderName,
            scene,
            {
                vertexSource: simpleWaterVertex,
                fragmentSource: simpleWaterFragment,
            },
            {
                attributes: ['position', 'uv'],
                uniforms: ['worldViewProjection', 'time', 'waterColor', 'highlightColor', 'opacity'],
                needAlphaBlending: true,
            }
        );

        // Set default values
        material.setFloat('time', 0);
        material.setColor3('waterColor', Color3.FromHexString('#206090'));
        material.setColor3('highlightColor', Color3.FromHexString('#60c0ff'));
        material.setFloat('opacity', 0.8);

        // Animate time
        scene.onBeforeRenderObservable.add(() => {
            const time = performance.now() * 0.001;
            material.setFloat('time', time);
        });

        return material;
    }
}