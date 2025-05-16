// src/app/engine/world/terrain-generator.models.ts

/**
 * Base options for all noise generation
 */
export interface NoiseOptions {
    /** Frequency/scale of the noise (higher = more detailed) */
    scale: number;
    /** Number of noise layers (more = more detail but slower) */
    octaves: number;
    /** How much each octave contributes to the final result (0-1) */
    persistence: number;
    /** How much frequency increases with each octave */
    lacunarity: number;
    /** Random seed for reproducible results */
    seed?: number;
}

/**
 * Options for general terrain generation
 */
export interface TerrainGenerationOptions {
    /** Width of terrain in world units */
    width: number;
    /** Depth/height of terrain in world units */
    depth: number;
    /** Resolution of the height map (width) */
    resolution: number;
    /** Minimum height of terrain */
    minHeight: number;
    /** Maximum height of terrain */
    maxHeight: number;
    /** Noise settings for base terrain */
    noiseOptions: NoiseOptions;
    /** Whether to apply smoothing to the generated height map */
    smooth?: boolean;
    /** Smoothing iterations (if smooth is true) */
    smoothIterations?: number;
    /** Whether to generate with Level of Detail (LOD) */
    useLod?: boolean;
    /** Name for the generated terrain mesh */
    name?: string;
}

/**
 * Options for mountain generation
 */
export interface MountainOptions {
    /** Center position of the mountain range */
    position: { x: number, z: number };
    /** Radius of mountain range influence */
    radius: number;
    /** Peak height */
    height: number;
    /** Roughness factor for the mountains (0-1) */
    roughness: number;
    /** Steepness factor (0-1) */
    steepness: number;
    /** Optional plateau height (percentage of height) */
    plateauHeight?: number;
}

/**
 * Options for river carving
 */
export interface RiverOptions {
    /** Start position {x, z} */
    start: { x: number, z: number };
    /** End position {x, z} */
    end?: { x: number, z: number };
    /** Control points for curved rivers */
    controlPoints?: { x: number, z: number }[];
    /** Width of the river */
    width: number;
    /** Depth of the river channel */
    depth: number;
    /** Meandering factor (0-1) */
    meandering?: number;
    /** Number of tributaries to generate */
    tributaries?: number;
}

/**
 * Options for erosion simulation
 */
export interface ErosionOptions {
    /** Number of erosion iterations */
    iterations: number;
    /** Erosion strength (0-1) */
    strength: number;
    /** Type of erosion to apply */
    type: ErosionType;
    /** Minimum slope required for thermal erosion */
    thermalTalusAngle?: number;
    /** Droplet lifetime for hydraulic erosion */
    dropletLifetime?: number;
    /** Droplet erosion strength */
    inertia?: number;
    /** Droplet capacity */
    capacity?: number;
}

/**
 * Types of erosion simulation
 */
export enum ErosionType {
    Hydraulic = 'hydraulic',
    Thermal = 'thermal',
    Combined = 'combined'
}

/**
 * Available biome types
 */
export enum BiomeType {
    Plains = 'plains',
    Mountains = 'mountains',
    Desert = 'desert',
    Forest = 'forest',
    Tundra = 'tundra',
    Swamp = 'swamp'
}

/**
 * Options for biome-based generation
 */
export interface BiomeOptions {
    /** Type of biome to generate */
    type: BiomeType;
    /** Intensity of biome characteristics (0-1) */
    intensity: number;
    /** Blend distance with neighboring biomes */
    blendDistance?: number;
    /** Random variation (0-1) */
    variation?: number;
    /** Biome-specific height scale */
    heightScale?: number;
}

/**
 * Internal height map structure used for terrain generation
 */
export interface HeightMapData {
    /** Width of the height map */
    width: number;
    /** Height of the height map */
    height: number;
    /** Buffer containing height values (0-1) */
    buffer: Float32Array;
    /** Minimum height value */
    minHeight: number;
    /** Maximum height value */
    maxHeight: number;
}