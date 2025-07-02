// src/app/engine/world/tree.ts
import { Scene } from '@babylonjs/core/scene';
import { TransformNode, Mesh, MeshBuilder } from '@babylonjs/core/Meshes';
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
    branchAngle?: number;      // max angle deviation in degrees
    lengthDecay?: number;      // multiplier for child branch length
    radiusDecay?: number;      // multiplier for child radius reduction
}

export class Tree {
    private static barkMaterial: PBRMaterial | null = null;

    private root: TransformNode;
    private randSeed: number;

    private readonly defaults: Required<TreeOptions> = {
        seed: 1,
        iterations: 5,
        initialHeight: 4,
        trunkRadius: 0.2,
        minGrowth: 0.85,
        maxGrowth: 1.2,
        branchSmooth: 12,
        minTipRadius: 0.01,
        branchAngle: 20,
        lengthDecay: 0.9,
        radiusDecay: 0.7,
    };

    private _cylOpts = {
        height: 1,
        diameterTop: 1,
        diameterBottom: 1,
        tessellation: 12,
        cap: Mesh.NO_CAP,
    };

    private _sphereOpts = {
        diameter: 1,
        segments: 12,
    };

    constructor(
        private scene: Scene,
        private materialService: MaterialService,
        private options: TreeOptions = {},
    ) {
        this.root = new TransformNode('treeRoot', scene);
        this.randSeed = this.options.seed ?? this.defaults.seed;
        this.ensureBarkMaterial();
        this.createTree();
    }

    private ensureBarkMaterial(): void {
        if (!Tree.barkMaterial) {
            const barkPath = '/assets/materials/nature/bark_willow/';
            Tree.barkMaterial = this.materialService.createPbrMaterial(
                'willow-bark',
                {
                    albedo: `${barkPath}bark_willow_diff_1k.jpg`,
                    ao: `${barkPath}bark_willow_ao_1k.jpg`,
                    metalRough: `${barkPath}bark_willow_arm_1k.jpg`,
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

    private createTree(): void {
        const opts = { ...this.defaults, ...this.options };
        this.branch(opts.initialHeight, opts.iterations, opts.trunkRadius, this.root, opts);
    }

    private branch(size: number, depth: number, baseRadius: number, parent: TransformNode, opts: Required<TreeOptions>): void {
        const isTip = depth === 0 || size < 0.5;

        let numBranches = 0;
        let topRadius = baseRadius * opts.radiusDecay;

        if (!isTip) {
            numBranches = Math.floor(this.rand(1, 4));
            topRadius = Math.max(baseRadius / Math.sqrt(numBranches), opts.minTipRadius);
        } else {
            topRadius = Math.max(baseRadius * 0.3, opts.minTipRadius);
        }

        this._cylOpts.height = size;
        this._cylOpts.diameterTop = topRadius * 2;
        this._cylOpts.diameterBottom = baseRadius * 2;
        this._cylOpts.tessellation = opts.branchSmooth;

        const cyl = MeshBuilder.CreateCylinder('branch', this._cylOpts, this.scene);
        cyl.material = Tree.barkMaterial!;
        cyl.parent = parent;
        cyl.position.y = size / 2;

        if (!isTip) {
            for (let i = 0; i < numBranches; i++) {
                const mod = this.rand(opts.minGrowth, opts.maxGrowth);
                const angle = opts.branchAngle * Math.PI / 180;
                const rotX = this.rand(-angle, angle);
                const rotY = this.rand(-angle, angle);
                const rotZ = this.rand(-angle, angle);

                const childSize = size * opts.lengthDecay * mod;
                const childRadius = topRadius;

                this._sphereOpts.diameter = Math.max(baseRadius, childRadius) * 1.5;
                this._sphereOpts.segments = opts.branchSmooth;
                const knuckle = MeshBuilder.CreateSphere('knuckle', this._sphereOpts, this.scene);
                knuckle.material = Tree.barkMaterial!;
                knuckle.parent = cyl;
                knuckle.position.y = size;

                const childNode = new TransformNode('branchNode', this.scene);
                childNode.parent = knuckle;
                childNode.rotation.set(rotX, rotY, rotZ);
                childNode.position.set(0, 0, 0);

                this.branch(childSize, depth - 1, childRadius, childNode, opts);
            }
        }
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
