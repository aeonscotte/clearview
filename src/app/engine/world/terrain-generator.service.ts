// src/app/engine/world/terrain-generator.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh, VertexData } from '@babylonjs/core/Meshes';
import { TerrainService } from './terrain.service';
import { MathUtils } from '../utils/math-utils.service';
import {
    TerrainGenerationOptions,
    NoiseOptions,
    HeightMapData,
    MountainOptions,
    RiverOptions,
    ErosionOptions,
    ErosionType,
    BiomeType,
    BiomeOptions
} from './terrain-generator.models';

/**
 * Service for procedural terrain generation, complementing TerrainService
 * Handles complex noise-based generation, natural features, and erosion simulation
 */
@Injectable({ providedIn: 'root' })
export class TerrainGeneratorService {
    // Pre-allocated buffers for performance
    private _noiseBuffer: Float32Array;
    private _heightBuffer: Float32Array;
    private _tempBuffer: Float32Array;

    // Pre-allocated vectors for calculations
    private _tempVector2 = new Vector2(0, 0);
    private _tempVector3 = new Vector3(0, 0, 0);
    private _tempNormal = new Vector3(0, 1, 0);
    private _tempPosition = new Vector3(0, 0, 0);

    // Used for gradient calculations
    private _gradients: Vector2[] = [
        new Vector2(1, 1), new Vector2(-1, 1),
        new Vector2(1, -1), new Vector2(-1, -1),
        new Vector2(1, 0), new Vector2(-1, 0),
        new Vector2(0, 1), new Vector2(0, -1)
    ];

    // Constants for noise generation
    private readonly MAX_RESOLUTION = 1024;
    private readonly PERMUTATION_SIZE = 256;
    private readonly PERLIN_OCTAVES = 6;
    private readonly DEFAULT_SEED = 42;

    // Permutation table for noise generation
    private _perm: Uint8Array;

    // Seed for reproducible random numbers
    private _currentSeed = this.DEFAULT_SEED;

    constructor(
        private terrainService: TerrainService,
        private mathUtils: MathUtils
    ) {
        // Pre-allocate buffers with maximum size
        this._noiseBuffer = new Float32Array(this.MAX_RESOLUTION * this.MAX_RESOLUTION);
        this._heightBuffer = new Float32Array(this.MAX_RESOLUTION * this.MAX_RESOLUTION);
        this._tempBuffer = new Float32Array(this.MAX_RESOLUTION * this.MAX_RESOLUTION);

        // Initialize permutation table
        this._perm = new Uint8Array(this.PERMUTATION_SIZE * 2);
        this.initPermutationTable(this.DEFAULT_SEED);
    }

    /**
     * Generate a complete terrain mesh based on provided options
     * @param scene The Babylon.js scene
     * @param options Terrain generation options
     * @returns The generated terrain mesh
     */
    generateTerrain(scene: Scene, options: TerrainGenerationOptions): Mesh {
        // Get or create name
        const name = options.name || `terrain-${Date.now()}`;

        // Generate height map
        const heightMapData = this.generateHeightMap(options);

        // Create a new mesh for the terrain
        const terrain = new Mesh(name, scene);

        // Generate geometry
        this.applyHeightMapToMesh(terrain, heightMapData, options);

        // Compute normals and optimize mesh
        const vertexData = VertexData.ExtractFromMesh(terrain);
        VertexData.ComputeNormals(
            vertexData.positions,
            vertexData.indices,
            vertexData.normals
        );
        vertexData.applyToMesh(terrain);

        // Optimize mesh
        terrain.convertToFlatShadedMesh();
        terrain.freezeWorldMatrix();
        terrain.doNotSyncBoundingInfo = true;

        return terrain;
    }

    /**
     * Apply a height map to an existing mesh
     * @param mesh The mesh to modify
     * @param heightMapData Height map data
     * @param options Terrain generation options
     */
    private applyHeightMapToMesh(mesh: Mesh, heightMapData: HeightMapData, options: TerrainGenerationOptions): void {
        const { width, depth, resolution, minHeight, maxHeight } = options;
        const { buffer, width: hmWidth, height: hmHeight } = heightMapData;

        // Create position buffer
        const positions: number[] = [];
        const indices: number[] = [];
        const uvs: number[] = [];

        // Calculate vertex positions
        const quadSize = {
            x: width / (hmWidth - 1),
            z: depth / (hmHeight - 1)
        };

        // Create vertices and UVs
        for (let z = 0; z < hmHeight; z++) {
            for (let x = 0; x < hmWidth; x++) {
                const index = z * hmWidth + x;
                const height = buffer[index] * (maxHeight - minHeight) + minHeight;

                // Position
                positions.push(
                    x * quadSize.x - width / 2, // Center mesh at origin
                    height,
                    z * quadSize.z - depth / 2
                );

                // UVs
                uvs.push(
                    x / (hmWidth - 1),
                    z / (hmHeight - 1)
                );
            }
        }

        // Create indices (triangles)
        for (let z = 0; z < hmHeight - 1; z++) {
            for (let x = 0; x < hmWidth - 1; x++) {
                const bottomLeft = z * hmWidth + x;
                const bottomRight = bottomLeft + 1;
                const topLeft = bottomLeft + hmWidth;
                const topRight = topLeft + 1;

                // Triangle 1
                indices.push(bottomLeft);
                indices.push(bottomRight);
                indices.push(topRight);

                // Triangle 2
                indices.push(bottomLeft);
                indices.push(topRight);
                indices.push(topLeft);
            }
        }

        // Create vertex data and apply to mesh
        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.uvs = uvs;

        // Create normals array
        vertexData.normals = new Float32Array(positions.length);

        // Calculate normals
        VertexData.ComputeNormals(positions, indices, vertexData.normals);

        vertexData.applyToMesh(mesh);
    }

    /**
     * Generate a height map based on provided options
     * @param options Terrain generation options
     * @returns Height map data
     */
    generateHeightMap(options: TerrainGenerationOptions): HeightMapData {
        const { resolution, noiseOptions, smooth, smoothIterations } = options;

        // Set seed if provided
        if (noiseOptions.seed !== undefined) {
            this.setSeed(noiseOptions.seed);
        }

        // Calculate dimensions (ensure square for now)
        const width = resolution;
        const height = resolution;

        // Generate base noise
        this.generateNoiseMap(
            width,
            height,
            noiseOptions,
            this._heightBuffer
        );

        // Apply smoothing if requested
        if (smooth) {
            const iterations = smoothIterations || 2;
            this.smoothHeightMap(this._heightBuffer, width, height, iterations);
        }

        return {
            width,
            height,
            buffer: this._heightBuffer,
            minHeight: options.minHeight,
            maxHeight: options.maxHeight
        };
    }

    /**
     * Set the random seed for noise generation
     * @param seed The seed value
     */
    setSeed(seed: number): void {
        this._currentSeed = seed;
        this.initPermutationTable(seed);
    }

    /**
     * Initialize permutation table for noise generation with the given seed
     * @param seed Random seed
     */
    private initPermutationTable(seed: number): void {
        const p = new Uint8Array(this.PERMUTATION_SIZE);

        // Fill array with ordered values
        for (let i = 0; i < this.PERMUTATION_SIZE; i++) {
            p[i] = i;
        }

        // Shuffle array
        let n = this.PERMUTATION_SIZE;
        let index, temp;

        // Seeded random shuffle
        const random = this.createSeededRandom(seed);

        while (n > 0) {
            index = Math.floor(random() * n--);
            temp = p[n];
            p[n] = p[index];
            p[index] = temp;
        }

        // Duplicate the permutation table
        for (let i = 0; i < this.PERMUTATION_SIZE; i++) {
            this._perm[i] = p[i];
            this._perm[i + this.PERMUTATION_SIZE] = p[i];
        }
    }

    /**
     * Create a seeded random number generator
     * @param seed Random seed
     * @returns Function that returns random numbers
     */
    private createSeededRandom(seed: number): () => number {
        return function () {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
    }

    /**
     * Generate a noise map using Perlin noise
     * @param width Width of the noise map
     * @param height Height of the noise map
     * @param options Noise generation options
     * @param resultBuffer Buffer to store the result (must be at least width*height in size)
     */
    generateNoiseMap(
        width: number,
        height: number,
        options: NoiseOptions,
        resultBuffer: Float32Array
    ): void {
        const { scale, octaves, persistence, lacunarity } = options;

        // Validate dimensions
        if (width * height > resultBuffer.length) {
            throw new Error("Result buffer is too small for the requested noise dimensions");
        }

        // Precalculate frequency and amplitude for each octave
        const frequencies: number[] = new Array(octaves);
        const amplitudes: number[] = new Array(octaves);

        let frequency = 1;
        let amplitude = 1;
        let totalAmplitude = 0;

        for (let i = 0; i < octaves; i++) {
            frequencies[i] = frequency;
            amplitudes[i] = amplitude;
            totalAmplitude += amplitude;

            frequency *= lacunarity;
            amplitude *= persistence;
        }

        // Generate multi-octave noise
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;

                let noise = 0;

                for (let o = 0; o < octaves; o++) {
                    // Calculate noise coordinates
                    const freq = frequencies[o];
                    const sampleX = x / scale * freq;
                    const sampleY = y / scale * freq;

                    // Add weighted noise
                    noise += this.perlinNoise(sampleX, sampleY) * amplitudes[o];
                }

                // Normalize by total amplitude
                noise /= totalAmplitude;

                // Store in buffer (ensure 0-1 range)
                resultBuffer[index] = (noise + 1) * 0.5;
            }
        }
    }

    /**
     * Calculate 2D Perlin noise at given coordinates
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Noise value (-1 to 1)
     */
    private perlinNoise(x: number, y: number): number {
        // Calculate grid cell coordinates
        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;

        // Calculate relative coordinates within cell
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        // Calculate fade curves
        const u = this.fade(xf);
        const v = this.fade(yf);

        // Calculate hash coordinates
        const aa = this._perm[this._perm[xi] + yi];
        const ab = this._perm[this._perm[xi] + yi + 1];
        const ba = this._perm[this._perm[xi + 1] + yi];
        const bb = this._perm[this._perm[xi + 1] + yi + 1];

        // Get gradient values
        const gradAA = this._gradients[aa & 7];
        const gradAB = this._gradients[ab & 7];
        const gradBA = this._gradients[ba & 7];
        const gradBB = this._gradients[bb & 7];

        // Calculate dot products
        const dotAA = gradAA.x * xf + gradAA.y * yf;
        const dotAB = gradAB.x * xf + gradAB.y * (yf - 1);
        const dotBA = gradBA.x * (xf - 1) + gradBA.y * yf;
        const dotBB = gradBB.x * (xf - 1) + gradBB.y * (yf - 1);

        // Interpolate dot products
        const x1 = this.mathUtils.lerp(dotAA, dotBA, u);
        const x2 = this.mathUtils.lerp(dotAB, dotBB, u);

        // Return final noise value
        return this.mathUtils.lerp(x1, x2, v);
    }

    /**
     * Fade function for Perlin noise (6t^5 - 15t^4 + 10t^3)
     * @param t Input value (0-1)
     * @returns Faded value
     */
    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Apply smoothing to a height map
     * @param buffer Height map buffer
     * @param width Width of the height map
     * @param height Height of the height map
     * @param iterations Number of smoothing iterations
     */
    smoothHeightMap(buffer: Float32Array, width: number, height: number, iterations: number): void {
        // Use temp buffer for smoothing
        const temp = this._tempBuffer;

        for (let iter = 0; iter < iterations; iter++) {
            // Copy buffer to temp for this iteration
            temp.set(buffer);

            // Apply smoothing (simple box filter)
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;

                    // Average with neighbors
                    buffer[idx] = (
                        temp[idx] +
                        temp[(y - 1) * width + x] +
                        temp[(y + 1) * width + x] +
                        temp[y * width + (x - 1)] +
                        temp[y * width + (x + 1)]
                    ) / 5;
                }
            }
        }
    }

    /**
     * Add mountain features to an existing terrain
     * @param terrain Terrain mesh to modify
     * @param options Mountain generation options
     */
    generateMountains(terrain: Mesh, options: MountainOptions): void {
        const { position, radius, height, roughness, steepness, plateauHeight } = options;

        // Get vertex data
        const vertexData = VertexData.ExtractFromMesh(terrain);
        const positions = vertexData.positions;

        if (!positions) {
            console.warn("Cannot add mountains: terrain mesh has no positions");
            return;
        }

        // Reuse temp vectors
        const center = this._tempVector3;
        center.set(position.x, 0, position.z);

        // Configure noise for mountain details
        const noiseOptions: NoiseOptions = {
            scale: 20,
            octaves: 4,
            persistence: 0.5,
            lacunarity: 2.0,
            seed: this._currentSeed + 1 // Different seed for variation
        };

        // Generate small noise map for mountain details
        const noiseRes = 128;
        this.generateNoiseMap(noiseRes, noiseRes, noiseOptions, this._noiseBuffer);

        // Apply mountain to terrain
        const vertexCount = positions.length / 3;
        for (let i = 0; i < vertexCount; i++) {
            const idx = i * 3;
            const x = positions[idx];
            const y = positions[idx + 1];
            const z = positions[idx + 2];

            // Calculate distance from mountain center
            this._tempPosition.set(x, 0, z);
            const dist = Vector3.Distance(this._tempPosition, center);

            if (dist < radius) {
                // Calculate height factor based on distance from center (0-1)
                const distFactor = 1 - (dist / radius);
                const falloff = this.mountainFalloff(distFactor, steepness);

                // Sample noise for mountain details
                const noiseX = Math.floor((x + radius) / (radius * 2) * noiseRes);
                const noiseY = Math.floor((z + radius) / (radius * 2) * noiseRes);
                const noiseIdx = Math.max(0, Math.min(noiseRes * noiseRes - 1, noiseY * noiseRes + noiseX));
                const noise = this._noiseBuffer[noiseIdx] * roughness;

                // Calculate new height
                let newHeight = y;

                // Apply plateau if specified
                if (plateauHeight !== undefined && distFactor > plateauHeight) {
                    // Flat plateau with slight noise
                    newHeight += height * (0.9 + noise * 0.1);
                } else {
                    // Normal mountain shape with noise
                    newHeight += height * falloff * (1 + noise);
                }

                // Update position
                positions[idx + 1] = newHeight;
            }
        }

        // Reapply vertex data and recompute normals
        if (!vertexData.normals) {
            vertexData.normals = new Float32Array(positions.length);
        }

        VertexData.ComputeNormals(positions, vertexData.indices, vertexData.normals);
        vertexData.applyToMesh(terrain);
    }

    /**
     * Falloff function for mountain height distribution
     * @param distance Normalized distance from center (0-1)
     * @param steepness Steepness factor (0-1)
     * @returns Height factor
     */
    private mountainFalloff(distance: number, steepness: number): number {
        // Adjust steepness (1 = sharp peak, 0 = gradual slope)
        const adj = 1 - steepness * 0.8;

        // Power falloff with adjusted curve
        return Math.pow(distance, 1 / adj);
    }

    /**
     * Carve a river path into an existing terrain
     * @param terrain Terrain mesh to modify
     * @param options River generation options
     */
    generateRiver(terrain: Mesh, options: RiverOptions): void {
        const { start, end, controlPoints, width, depth, meandering = 0.3 } = options;

        // Get vertex data
        const vertexData = VertexData.ExtractFromMesh(terrain);
        const positions = vertexData.positions;

        if (!positions) {
            console.warn("Cannot add river: terrain mesh has no positions");
            return;
        }

        // Determine river path
        const path: Vector2[] = [];

        // Generate path based on inputs
        if (controlPoints && controlPoints.length > 0) {
            // Use control points
            path.push(new Vector2(start.x, start.z));

            for (const point of controlPoints) {
                path.push(new Vector2(point.x, point.z));
            }

            if (end) {
                path.push(new Vector2(end.x, end.z));
            }
        } else if (end) {
            // Straight line with meandering
            path.push(new Vector2(start.x, start.z));

            // Generate meandering river with intermediate points
            const segments = Math.max(2, Math.floor(Vector2.Distance(
                new Vector2(start.x, start.z),
                new Vector2(end.x, end.z)
            ) / 10));

            for (let i = 1; i < segments; i++) {
                const t = i / segments;

                // Interpolate position
                const x = start.x + (end.x - start.x) * t;
                const z = start.z + (end.z - start.z) * t;

                // Add meandering
                const offset = Math.sin(t * Math.PI * 2) * width * meandering;
                const dir = new Vector2(-(end.z - start.z), end.x - start.x).normalize();

                path.push(new Vector2(
                    x + dir.x * offset,
                    z + dir.y * offset
                ));
            }

            path.push(new Vector2(end.x, end.z));
        } else {
            // Just start point - create a small pool
            path.push(new Vector2(start.x, start.z));
        }

        // Apply river to terrain
        const vertexCount = positions.length / 3;

        // For each vertex, check distance to river path
        for (let i = 0; i < vertexCount; i++) {
            const idx = i * 3;
            const x = positions[idx];
            const y = positions[idx + 1];
            const z = positions[idx + 2];

            // Find minimum distance to river path
            let minDist = Number.MAX_VALUE;

            // Check distance to each segment
            for (let p = 0; p < path.length - 1; p++) {
                const a = path[p];
                const b = path[p + 1];

                // Calculate distance to line segment
                this._tempVector2.set(x, z);
                const dist = this.distanceToLineSegment(this._tempVector2, a, b);

                if (dist < minDist) {
                    minDist = dist;
                }
            }

            // Apply river carving
            if (minDist < width) {
                // Calculate depth factor based on distance
                const depthFactor = 1 - (minDist / width);

                // Calculate new height with smooth falloff at edges
                const bedDepth = depth * Math.pow(depthFactor, 0.7);
                positions[idx + 1] = Math.max(0, y - bedDepth);
            }
        }

        // Reapply vertex data and recompute normals
        if (!vertexData.normals) {
            vertexData.normals = new Float32Array(positions.length);
        }
        VertexData.ComputeNormals(positions, vertexData.indices, vertexData.normals);
        vertexData.applyToMesh(terrain);
    }

    /**
     * Calculate distance from point to line segment
     * @param p Point to check
     * @param a Start of line segment
     * @param b End of line segment
     * @returns Minimum distance
     */
    private distanceToLineSegment(p: Vector2, a: Vector2, b: Vector2): number {
        const lengthSquared = Vector2.DistanceSquared(a, b);

        // Line is actually a point
        if (lengthSquared === 0) {
            return Vector2.Distance(p, a);
        }

        // Calculate projection
        const t = Math.max(0, Math.min(1, Vector2.Dot(
            new Vector2(p.x - a.x, p.y - a.y),
            new Vector2(b.x - a.x, b.y - a.y)
        ) / lengthSquared));

        // Calculate closest point on segment
        const closest = new Vector2(
            a.x + t * (b.x - a.x),
            a.y + t * (b.y - a.y)
        );

        // Return distance
        return Vector2.Distance(p, closest);
    }

    /**
     * Apply erosion simulation to terrain
     * @param terrain Terrain mesh to modify
     * @param options Erosion options
     */
    applyErosion(terrain: Mesh, options: ErosionOptions): void {
        const { iterations, strength, type } = options;

        // Different erosion types
        if (type === ErosionType.Thermal || type === ErosionType.Combined) {
            this.applyThermalErosion(terrain, iterations, strength, options.thermalTalusAngle || 0.5);
        }

        if (type === ErosionType.Hydraulic || type === ErosionType.Combined) {
            this.applyHydraulicErosion(terrain, iterations, strength, {
                dropletLifetime: options.dropletLifetime || 30,
                inertia: options.inertia || 0.3,
                capacity: options.capacity || 4
            });
        }
    }

    /**
     * Apply thermal erosion (material slides down slopes)
     * @param terrain Terrain mesh to modify
     * @param iterations Number of iterations
     * @param strength Erosion strength (0-1)
     * @param talusAngle Maximum stable slope angle
     */
    private applyThermalErosion(terrain: Mesh, iterations: number, strength: number, talusAngle: number): void {
        // Implementation would simulate material sliding downhill
        // This is a simplified version that smooths steep slopes

        const vertexData = VertexData.ExtractFromMesh(terrain);
        const positions = vertexData.positions;
        const indices = vertexData.indices;

        if (!positions || !indices) {
            console.warn("Cannot apply erosion: terrain mesh has incomplete data");
            return;
        }

        // Convert talusAngle to a height threshold
        const maxHeightDiff = Math.tan(talusAngle * Math.PI / 2);

        // Create temp height map
        const tempPositions = new Float32Array(positions.length);

        for (let iter = 0; iter < iterations; iter++) {
            // Copy positions to temp buffer
            tempPositions.set(positions);

            // Process each triangle
            for (let i = 0; i < indices.length; i += 3) {
                const a = indices[i] * 3;
                const b = indices[i + 1] * 3;
                const c = indices[i + 2] * 3;

                // Check height differences
                const ha = positions[a + 1];
                const hb = positions[b + 1];
                const hc = positions[c + 1];

                // Find steepest point
                let maxIdx = a;
                let maxHeight = ha;
                let minIdx = a;
                let minHeight = ha;

                if (hb > maxHeight) {
                    maxIdx = b;
                    maxHeight = hb;
                } else if (hb < minHeight) {
                    minIdx = b;
                    minHeight = hb;
                }

                if (hc > maxHeight) {
                    maxIdx = c;
                    maxHeight = hc;
                } else if (hc < minHeight) {
                    minIdx = c;
                    minHeight = hc;
                }

                // Check if slope exceeds threshold
                const heightDiff = maxHeight - minHeight;
                const dist = Vector2.Distance(
                    new Vector2(positions[maxIdx], positions[maxIdx + 2]),
                    new Vector2(positions[minIdx], positions[minIdx + 2])
                );

                if (heightDiff > dist * maxHeightDiff) {
                    // Erode by moving material from high to low
                    const movingMaterial = (heightDiff - dist * maxHeightDiff) * strength;

                    // Update height in temp buffer
                    tempPositions[maxIdx + 1] -= movingMaterial;
                    tempPositions[minIdx + 1] += movingMaterial;
                }
            }

            // Apply temp buffer back to positions
            for (let j = 0; j < positions.length; j++) {
                positions[j] = tempPositions[j];
            }
        }

        // Reapply vertex data and recompute normals
        if (!vertexData.normals) {
            vertexData.normals = new Float32Array(positions.length);
        }
        VertexData.ComputeNormals(positions, indices, vertexData.normals);
        vertexData.applyToMesh(terrain);
    }

    /**
     * Apply hydraulic erosion (simulates water flow)
     * @param terrain Terrain mesh to modify
     * @param iterations Number of iterations
     * @param strength Erosion strength (0-1)
     * @param params Additional parameters
     */
    private applyHydraulicErosion(
        terrain: Mesh,
        iterations: number,
        strength: number,
        params: {
            dropletLifetime: number,
            inertia: number,
            capacity: number
        }
    ): void {
        // A fully accurate hydraulic erosion would be complex
        // This is a simplified version that focuses on performance

        // Convert terrain to height field
        const vertexData = VertexData.ExtractFromMesh(terrain);
        const positions = vertexData.positions;
        const indices = vertexData.indices;

        if (!positions || !indices) {
            console.warn("Cannot apply erosion: terrain mesh has incomplete data");
            return;
        }

        // Extract terrain dimensions
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (let i = 0; i < positions.length; i += 3) {
            minX = Math.min(minX, positions[i]);
            maxX = Math.max(maxX, positions[i]);
            minZ = Math.min(minZ, positions[i + 2]);
            maxZ = Math.max(maxZ, positions[i + 2]);
        }

        const width = maxX - minX;
        const height = maxZ - minZ;

        // Random raindrop simulation
        for (let i = 0; i < iterations; i++) {
            // Create a random raindrop position
            const x = minX + Math.random() * width;
            const z = minZ + Math.random() * height;

            // Track droplet properties
            let posX = x;
            let posZ = z;
            let dirX = 0;
            let dirZ = 0;
            let speed = 1.0;
            let water = 1.0;
            let sediment = 0.0;

            // Simulate droplet lifetime
            for (let lifetime = 0; lifetime < params.dropletLifetime; lifetime++) {
                // Find the triangle containing current position
                let containingTriangle = -1;
                let barycentricCoords = null;

                for (let t = 0; t < indices.length; t += 3) {
                    const v1 = indices[t] * 3;
                    const v2 = indices[t + 1] * 3;
                    const v3 = indices[t + 2] * 3;

                    // Check if point is in this triangle
                    const coords = this.calculateBarycentricCoords(
                        posX, posZ,
                        positions[v1], positions[v1 + 2],
                        positions[v2], positions[v2 + 2],
                        positions[v3], positions[v3 + 2]
                    );

                    if (coords.u >= 0 && coords.v >= 0 && coords.w >= 0) {
                        containingTriangle = t;
                        barycentricCoords = coords;
                        break;
                    }
                }

                if (containingTriangle === -1 || !barycentricCoords) {
                    // Droplet left the terrain
                    break;
                }

                // Calculate height and gradient at current position
                const v1 = indices[containingTriangle] * 3;
                const v2 = indices[containingTriangle + 1] * 3;
                const v3 = indices[containingTriangle + 2] * 3;

                const h1 = positions[v1 + 1];
                const h2 = positions[v2 + 1];
                const h3 = positions[v3 + 1];

                // Interpolate height
                const height = h1 * barycentricCoords.u +
                    h2 * barycentricCoords.v +
                    h3 * barycentricCoords.w;

                // Calculate gradient (unnormalized)
                const gradX = (positions[v2] - positions[v1]) * (h3 - h1) -
                    (positions[v3] - positions[v1]) * (h2 - h1);

                const gradZ = (positions[v2 + 2] - positions[v1 + 2]) * (h3 - h1) -
                    (positions[v3 + 2] - positions[v1 + 2]) * (h2 - h1);

                // Update droplet direction
                const len = Math.sqrt(gradX * gradX + gradZ * gradZ);
                if (len !== 0) {
                    // Calculate new direction with inertia
                    const newDirX = gradX / len;
                    const newDirZ = gradZ / len;

                    dirX = dirX * params.inertia - newDirX * (1 - params.inertia);
                    dirZ = dirZ * params.inertia - newDirZ * (1 - params.inertia);

                    // Normalize direction
                    const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ);
                    if (dirLen !== 0) {
                        dirX /= dirLen;
                        dirZ /= dirLen;
                    }
                }

                // Calculate droplet's carrying capacity based on speed and slope
                const slope = len / Math.sqrt(
                    (positions[v2] - positions[v1]) * (positions[v2] - positions[v1]) +
                    (positions[v2 + 2] - positions[v1 + 2]) * (positions[v2 + 2] - positions[v1 + 2])
                );

                const capacity = Math.max(0, speed * slope * water * params.capacity);

                // Erode or deposit
                if (sediment > capacity) {
                    // Deposit sediment
                    const deposit = (sediment - capacity) * strength;
                    sediment -= deposit;

                    // Distribute deposit to vertices based on barycentric coords
                    positions[v1 + 1] += deposit * barycentricCoords.u;
                    positions[v2 + 1] += deposit * barycentricCoords.v;
                    positions[v3 + 1] += deposit * barycentricCoords.w;
                } else {
                    // Erode terrain
                    const erosion = Math.min((capacity - sediment) * strength, 0.1);

                    // Distribute erosion to vertices based on barycentric coords
                    positions[v1 + 1] -= erosion * barycentricCoords.u;
                    positions[v2 + 1] -= erosion * barycentricCoords.v;
                    positions[v3 + 1] -= erosion * barycentricCoords.w;

                    sediment += erosion;
                }

                // Update droplet position
                posX += dirX;
                posZ += dirZ;

                // Update water volume (evaporation)
                water *= 0.99;

                // Update speed
                speed = Math.sqrt(speed * speed + len * 0.1);
            }
        }

        // Reapply vertex data and recompute normals
        VertexData.ComputeNormals(positions, indices, vertexData.normals);
        vertexData.applyToMesh(terrain);
    }

    /**
     * Calculate barycentric coordinates of a point in a triangle
     * @param x X coordinate of point
     * @param z Z coordinate of point
     * @param x1 X coordinate of first vertex
     * @param z1 Z coordinate of first vertex
     * @param x2 X coordinate of second vertex
     * @param z2 Z coordinate of second vertex
     * @param x3 X coordinate of third vertex
     * @param z3 Z coordinate of third vertex
     * @returns Barycentric coordinates (u, v, w)
     */
    private calculateBarycentricCoords(
        x: number, z: number,
        x1: number, z1: number,
        x2: number, z2: number,
        x3: number, z3: number
    ): { u: number, v: number, w: number } {
        const denominator = ((z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3));

        if (Math.abs(denominator) < 0.0001) {
            // Degenerate triangle
            return { u: 0, v: 0, w: 0 };
        }

        const u = ((z2 - z3) * (x - x3) + (x3 - x2) * (z - z3)) / denominator;
        const v = ((z3 - z1) * (x - x3) + (x1 - x3) * (z - z3)) / denominator;
        const w = 1 - u - v;

        return { u, v, w };
    }

    /**
     * Apply biome-based generation to terrain
     * @param terrain Terrain mesh to modify
     * @param options Biome generation options
     */
    generateBiome(terrain: Mesh, options: BiomeOptions): void {
        const { type, intensity, heightScale = 1.0, variation = 0.5 } = options;

        // Get vertex data
        const vertexData = VertexData.ExtractFromMesh(terrain);
        const positions = vertexData.positions;

        if (!positions) {
            console.warn("Cannot apply biome: terrain mesh has no positions");
            return;
        }

        // Configure noise settings for this biome
        const noiseOptions: NoiseOptions = {
            scale: 50,
            octaves: 4,
            persistence: 0.5,
            lacunarity: 2.0,
            seed: this._currentSeed + (Object.values(BiomeType).indexOf(type) * 100)
        };

        // Generate biome-specific noise
        const noiseRes = 256;
        this.generateNoiseMap(noiseRes, noiseRes, noiseOptions, this._noiseBuffer);

        // Extract terrain dimensions
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (let i = 0; i < positions.length; i += 3) {
            minX = Math.min(minX, positions[i]);
            maxX = Math.max(maxX, positions[i]);
            minZ = Math.min(minZ, positions[i + 2]);
            maxZ = Math.max(maxZ, positions[i + 2]);
        }

        const width = maxX - minX;
        const height = maxZ - minZ;

        // Apply biome transformation
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];

            // Calculate noise coordinates
            const noiseX = Math.floor(((x - minX) / width) * (noiseRes - 1));
            const noiseZ = Math.floor(((z - minZ) / height) * (noiseRes - 1));
            const noiseIdx = Math.max(0, Math.min(noiseRes * noiseRes - 1, noiseZ * noiseRes + noiseX));

            let noise = this._noiseBuffer[noiseIdx] * variation;

            // Apply biome-specific transformations
            let heightModifier = 0;

            switch (type) {
                case BiomeType.Plains:
                    // Smooth rolling hills
                    heightModifier = (noise - 0.5) * 0.5 * intensity;
                    break;

                case BiomeType.Mountains:
                    // Dramatic height increases with sharp ridges
                    noise = Math.pow(noise, 1.5);
                    heightModifier = noise * 2 * intensity;
                    break;

                case BiomeType.Desert:
                    // Sand dunes
                    noise = Math.sin(noise * Math.PI * 3) * 0.5 + 0.5;
                    heightModifier = noise * 0.7 * intensity;
                    break;

                case BiomeType.Forest:
                    // Subtle variations with occasional clearings
                    heightModifier = (noise * 0.3 + 0.2) * intensity;
                    break;

                case BiomeType.Tundra:
                    // Mostly flat with occasional frost heaves
                    noise = Math.pow(noise, 2);
                    heightModifier = (noise - 0.3) * 0.5 * intensity;
                    break;

                case BiomeType.Swamp:
                    // Mostly flat with water pools
                    noise = Math.sin(noise * Math.PI * 6) * 0.3;
                    heightModifier = (noise - 0.2) * 0.4 * intensity;
                    break;
            }

            // Apply height modification
            positions[i + 1] = y * (1 + heightModifier * heightScale);
        }

        // Reapply vertex data and recompute normals
        VertexData.ComputeNormals(positions, vertexData.indices, vertexData.normals);
        vertexData.applyToMesh(terrain);
    }
}