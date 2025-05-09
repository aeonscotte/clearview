// src/app/engine/material/material.service.ts
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';

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
}
