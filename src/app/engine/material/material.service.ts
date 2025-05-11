// src/app/engine/material/material.service.ts
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { int } from '@babylonjs/core';

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

export class MaterialService {
    applyPBRMaterial(scene: Scene, mesh: Mesh, options: PBRMaterialOptions): void {
        const {
            name = 'pbr-material',
            albedoTextureUrl,
            normalTextureUrl,
            metallicTextureUrl,
            roughness = 1,
            metallic = 0.5,
        } = options;

        const material = new PBRMaterial(name, scene);

        if (albedoTextureUrl) {
            material.albedoTexture = new Texture(albedoTextureUrl, scene);
        }
        if (normalTextureUrl) {
            material.bumpTexture = new Texture(normalTextureUrl, scene);
        }
        if (metallicTextureUrl) {
            material.metallicTexture = new Texture(metallicTextureUrl, scene);
        }

        material.roughness = roughness;
        material.metallic = metallic;

        mesh.material = material;
    }

    applyBasicTexture(scene: Scene, mesh: Mesh, options: BasicTextureOptions): void {
        const {
            name = 'basic-texture-material',
            textureUrl,
        } = options;

        const material = new StandardMaterial(name, scene);
        material.diffuseTexture = new Texture(textureUrl, scene);
        mesh.material = material;
    }

    createGroundMaterial(materialUrl: string, tileSize: number): PBRMaterial {
        // Texture loading
        const albedoTex = new Texture(`${materialUrl}albedo.png`);
        const normHeightTex = new Texture(`${materialUrl}normalHeight.png`);
        const aoTex = new Texture(`${materialUrl}ao.png`);
        const metalRoughTex = new Texture(`${materialUrl}metalRough.png`);

        // Tiling
        [albedoTex, normHeightTex, aoTex, metalRoughTex].forEach(tex => {
            tex.uScale = tileSize;
            tex.vScale = tileSize;
        });

        // // Material setup
        const material = new PBRMaterial("groundMaterial");

        material.albedoTexture = albedoTex;
        material.bumpTexture = normHeightTex;
        material.useParallax = true;
        material.useParallaxOcclusion = true;
        material.parallaxScaleBias = 0.03;
        material.metallicTexture = metalRoughTex;
        material.useRoughnessFromMetallicTextureAlpha = true;
        material.ambientTexture = aoTex;
        material.ambientTextureStrength = 0.8;
        material.bumpTexture.level = 0.5;
        return material;
    }

}
