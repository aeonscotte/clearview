import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, Mesh } from '@babylonjs/core/Meshes';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Injectable } from '@angular/core';

export interface HeightMapOptions {
    name?: string;
    url: string;
    width?: number;
    height?: number;
    subdivisions?: number;
    minHeight?: number;
    maxHeight?: number;
    colorTextureUrl?: string;
}

export interface GroundOptions {
    name?: string;
    width?: number;
    height?: number;
    subdivisions?: number;
}

export interface BoxOptions {
    name?: string;
    size?: number;
    position?: Vector3;
}

@Injectable({
    providedIn: 'root'
})
export class TerrainService {
    createHeightMap(scene: Scene, options: HeightMapOptions): Mesh {
        const {
            name = 'heightmap',
            url,
            width = 100,
            height = 100,
            subdivisions = 100,
            minHeight = 0,
            maxHeight = 10,
            colorTextureUrl
        } = options;

        const ground = MeshBuilder.CreateGroundFromHeightMap(name, url, {
            width,
            height,
            subdivisions,
            minHeight,
            maxHeight,
        }, scene);

        if (colorTextureUrl) {
            const material = new StandardMaterial(`${name}-mat`, scene);
            material.diffuseTexture = new Texture(colorTextureUrl, scene);
            ground.material = material;
        }

        return ground;
    }

    createGround(scene: Scene, options: GroundOptions = {}): Mesh {
        const {
            name = 'ground',
            width = 50,
            height = 50,
            subdivisions = 1,
        } = options;

        return MeshBuilder.CreateGround(name, {
            width,
            height,
            subdivisions
        }, scene);
    }

    createBox(scene: Scene, options: BoxOptions = {}): Mesh {
        const {
            name = 'box',
            size = 2,
            position = new Vector3(0, size / 2, 0),
        } = options;

        const box = MeshBuilder.CreateBox(name, { size }, scene);
        box.position = position;
        return box;
    }
}
