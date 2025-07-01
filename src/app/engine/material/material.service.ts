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

    createGroundMaterial(materialUrl: string, tileSize: number, scene: Scene): PBRMaterial {
        // Use scene ID in cache key
        const materialName = `ground-${materialUrl.replace(/\//g, '-')}-${tileSize}`;

        // Check for cached material
        let material = this.assetManager.getMaterial(materialName, scene) as PBRMaterial;
        if (material) return material;

        try {
            // Create textures
            const albedoTexUrl = `${materialUrl}albedo.png`;
            const normHeightTexUrl = `${materialUrl}normalHeight.png`;
            const aoTexUrl = `${materialUrl}ao.png`;
            const metalRoughTexUrl = `${materialUrl}metalRough.png`;

            // Get textures from asset manager
            const albedoTex = this.assetManager.getTexture(albedoTexUrl, scene);
            const normHeightTex = this.assetManager.getTexture(normHeightTexUrl, scene);
            const aoTex = this.assetManager.getTexture(aoTexUrl, scene);
            const metalRoughTex = this.assetManager.getTexture(metalRoughTexUrl, scene);

            // Set texture tiling
            [albedoTex, normHeightTex, aoTex, metalRoughTex].forEach(tex => {
                tex.uScale = tileSize;
                tex.vScale = tileSize;
            });

            // Create the material
            material = new PBRMaterial(materialName, scene);

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
            material.maxSimultaneousLights = 8;

            // Register the material
            this.assetManager.registerMaterial(material, materialName, scene);

            return material;
        } catch (error) {
            console.error('Error creating material:', error);

            // Create fallback material if loading fails
            const fallback = new PBRMaterial("fallback-material", scene);
            fallback.albedoColor = new Color3(1, 0, 1); // Magenta for visibility
            return fallback;
        }
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