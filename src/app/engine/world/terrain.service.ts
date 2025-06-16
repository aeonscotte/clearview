// src/app/engine/world/terrain.service.ts
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, Mesh } from '@babylonjs/core/Meshes';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
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
    // Pre-allocated objects for mesh creation
    private _defaultPosition = new Vector3(0, 0, 0);
    private _tempColor = new Color3(0, 0, 0);
    
    // Pre-allocated options objects to avoid creating objects in frequently called methods
    private _groundCreateOptions = {
        width: 50,
        height: 50,
        subdivisions: 1
    };
    
    private _heightMapCreateOptions = {
        width: 100,
        height: 100,
        subdivisions: 100,
        minHeight: 0,
        maxHeight: 10
    };
    
    private _boxCreateOptions = {
        size: 2
    };

    createHeightMap(scene: Scene, options: HeightMapOptions): Mesh {
        const {
            name = 'heightmap',
            url,
            width = 1000,
            height = 1000,
            subdivisions = 10000,
            minHeight = 0,
            maxHeight = 100,
            colorTextureUrl
        } = options;

        // Update pre-allocated options object
        this._heightMapCreateOptions.width = width;
        this._heightMapCreateOptions.height = height;
        this._heightMapCreateOptions.subdivisions = subdivisions;
        this._heightMapCreateOptions.minHeight = minHeight;
        this._heightMapCreateOptions.maxHeight = maxHeight;

        const ground = MeshBuilder.CreateGroundFromHeightMap(
            name, 
            url, 
            this._heightMapCreateOptions, 
            scene
        );

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

        // Update pre-allocated options object
        this._groundCreateOptions.width = width;
        this._groundCreateOptions.height = height;
        this._groundCreateOptions.subdivisions = subdivisions;

        return MeshBuilder.CreateGround(
            name, 
            this._groundCreateOptions, 
            scene
        );
    }

    createBox(scene: Scene, options: BoxOptions = {}): Mesh {
        const {
            name = 'box',
            size = 2,
            position
        } = options;

        // Update pre-allocated options object
        this._boxCreateOptions.size = size;

        const box = MeshBuilder.CreateBox(name, this._boxCreateOptions, scene);
        
        // Handle position assignment
        if (position) {
            box.position.copyFrom(position);
        } else {
            // Typical default is to place box so bottom is at ground level
            this._defaultPosition.set(0, size / 2, 0);
            box.position.copyFrom(this._defaultPosition);
        }
        
        return box;
    }
    
    // Create a reusable box with color
    createColoredBox(scene: Scene, options: BoxOptions = {}, color: string = '#CCCCCC'): Mesh {
        const box = this.createBox(scene, options);
        
        // Create material if color specified
        if (color) {
            const material = new StandardMaterial(`${box.name}-mat`, scene);
            // Use pre-allocated color object
            this.hexToColor3(color, this._tempColor);
            material.diffuseColor = this._tempColor.clone(); // Need to clone here as material needs its own copy
            box.material = material;
        }
        
        return box;
    }
    
    // Helper method to convert hex color to Color3 - using pre-allocated color
    private hexToColor3(hex: string, result: Color3): Color3 {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        
        // Handle shorthand hex (e.g. #FFF)
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        // Parse hex to RGB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        result.set(r, g, b);
        return result;
    }
    
    // Additional methods for terrain generation
    
    // Create a multi-material terrain with regions (like grass, rock, sand)
    createTerrainGrid(scene: Scene, size: number, subdivisionsPerSide: number = 8): Mesh {
        const totalWidth = size;
        const totalHeight = size;
        const subdivisions = subdivisionsPerSide;
        
        // Create base ground
        const options: GroundOptions = {
            name: 'terrainGrid',
            width: totalWidth,
            height: totalHeight,
            subdivisions: subdivisions
        };
        
        return this.createGround(scene, options);
    }
    
    // Create a simple hill terrain using a procedural height map
    createSimpleHillTerrain(scene: Scene, options: GroundOptions = {}): Mesh {
        const ground = this.createGround(scene, options);
        
        // We would typically modify vertices here to create hills
        // This is a placeholder for a more sophisticated implementation
        
        return ground;
    }
    
    // Flatten a specific area of terrain - useful for building placement
    flattenTerrainArea(terrain: Mesh, center: Vector3, radius: number): void {
        // Implementation would modify the terrain vertices
        // This is a placeholder for actual terrain modification
        console.log(`Flattening terrain at ${center.x}, ${center.z} with radius ${radius}`);
    }
    
    // Method to apply texture splatting to a terrain
    applyTerrainTextures(terrain: Mesh, scene: Scene, texturePaths: string[]): void {
        // Implementation would apply multi-texturing to the terrain
        // This is a placeholder for actual texture splatting implementation
        console.log(`Applying ${texturePaths.length} textures to terrain`);
    }
}