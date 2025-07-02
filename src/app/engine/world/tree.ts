// src/app/engine/world/tree.ts
import { Scene } from '@babylonjs/core/scene';
import { TransformNode, MeshBuilder } from '@babylonjs/core/Meshes';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { MaterialService } from '../material/material.service';

export interface TreeOptions {
    seed?: number;
    iterations?: number;
    initialHeight?: number;
    trunkRadius?: number;
    minGrowth?: number;
    maxGrowth?: number;
    branchSmooth?: number;
    minTipRadius?: number;
    branchAngle?: number;      // degrees
    angleTolerance?: number;   // yaw variance from even spacing (degrees)
    bushiness?: number;        // 0 vertical, 1 horizontal
    lengthFactor?: number;     // child branch length multiplier
    lengthDecay?: number;      // additional reduction in length per generation
    phototropism?: number;     // 0 none, 1 strong upward bias
    baseTopFactor?: number;    // fraction of base radius for initial top radius
    tipFactor?: number;        // fraction of base radius at tips
    maxBranches?: number;      // maximum number of child branches
}

export class Tree {
    private static barkMaterial: PBRMaterial | null = null;

    private readonly defaults: Required<TreeOptions> = {
        seed: 46,
        iterations: 5,
        initialHeight: 4,
        trunkRadius: 0.2,
        minGrowth: 0.85,
        maxGrowth: 1.2,
        branchSmooth: 12,
        minTipRadius: 0.01,
        branchAngle: 12,
        angleTolerance: 5,
        bushiness: 0.5,
        lengthFactor: 0.9,
        lengthDecay: 0.6,
        phototropism: 1.25,
        baseTopFactor: 0.7,
        tipFactor: 0.3,
        maxBranches: 3,       // inclusive upper bound will add 1
    };

    private root: TransformNode;
    private randSeed: number;

    constructor(
        private scene: Scene,
        private materialService: MaterialService,
        private options: TreeOptions = {},
    ) {
        this.root = new TransformNode('treeRoot', scene);
        const opts = { ...this.defaults, ...this.options };
        this.randSeed = opts.seed;
        this.ensureBarkMaterial();
        const trunk = this.branch(opts.initialHeight, opts.iterations, opts.trunkRadius, opts);
        trunk.parent = this.root;
    }

    private ensureBarkMaterial(): void {
        if (!Tree.barkMaterial) {
            const path = '/assets/materials/nature/bark_willow/';
            Tree.barkMaterial = this.materialService.createPbrMaterial(
                'willow-bark',
                {
                    albedo: `${path}bark_willow_diff_1k.jpg`,
                    ao: `${path}bark_willow_ao_1k.jpg`,
                    metalRough: `${path}bark_willow_arm_1k.jpg`,
                },
                this.scene,
                1,
            );
        }
    }

    private rand(min: number, max: number): number {
        const x = Math.sin(this.randSeed++) * 10000;
        return min + (x - Math.floor(x)) * (max - min);
    }

    private branch(size: number, depth: number, baseRadius: number, opts: Required<TreeOptions>): TransformNode {
        const isTip = depth === 0 || size < 0.5;

        let numBranches = 0;
        let topRadius = baseRadius * opts.baseTopFactor;
        let childBaseRadius = 0;

        if (!isTip) {
            numBranches = Math.floor(this.rand(2, opts.maxBranches + 1));
            childBaseRadius = Math.max(topRadius / Math.sqrt(numBranches), opts.minTipRadius);
            topRadius = childBaseRadius * Math.sqrt(numBranches);
        } else {
            topRadius = Math.max(baseRadius * opts.tipFactor, opts.minTipRadius);
        }

        const node = new TransformNode('branchNode', this.scene);

        const cyl = MeshBuilder.CreateCylinder('cyl', {
            height: size,
            diameterTop: topRadius * 2,
            diameterBottom: baseRadius * 2,
            tessellation: opts.branchSmooth,
        }, this.scene);
        cyl.material = Tree.barkMaterial!;
        cyl.parent = node;
        cyl.position.y = size / 2;

        if (!isTip) {
            const yawSpacing = 360 / numBranches;
            const normalizedDepth = (opts.iterations - depth) / opts.iterations;
            for (let i = 0; i < numBranches; i++) {
                const mod = this.rand(opts.minGrowth, opts.maxGrowth);
                const yaw = (i * yawSpacing + this.rand(-opts.angleTolerance, opts.angleTolerance)) * Math.PI / 180;
                const upwardBias = opts.phototropism * normalizedDepth;
                let pitchBase = (Math.PI / 2) * opts.bushiness * (1 - upwardBias);
                pitchBase = Math.max(0, pitchBase);
                let pitch = pitchBase + this.rand(-opts.branchAngle, opts.branchAngle) * Math.PI / 180;
                const maxPitch = 75 * Math.PI / 180;
                pitch = Math.max(0, Math.min(maxPitch, pitch));
                const roll = this.rand(-opts.branchAngle, opts.branchAngle) * Math.PI / 180;

                const childSize = size * opts.lengthFactor * opts.lengthDecay * mod;
                const childRadius = childBaseRadius;

                const knuckle = MeshBuilder.CreateSphere('knuckle', {
                    diameter: Math.max(childRadius, topRadius) * 2 * 1.05,
                    segments: opts.branchSmooth,
                }, this.scene);
                knuckle.material = Tree.barkMaterial!;
                knuckle.parent = node;
                knuckle.position.y = size;

                const child = this.branch(childSize, depth - 1, childRadius, opts);
                child.parent = knuckle;
                child.position = new Vector3(0, 0, 0);
                child.rotation = new Vector3(pitch, yaw, roll);
            }
        }

        return node;
    }

    setPosition(pos: Vector3): void {
        this.root.position.copyFrom(pos);
    }

    getRoot(): TransformNode {
        return this.root;
    }

    dispose(): void {
        this.root.dispose();
    }
}
