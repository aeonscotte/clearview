// src/app/engine/base/scene.ts
import type { Scene } from '@babylonjs/core';
import type { Engine } from '@babylonjs/core/Engines/engine';

export abstract class BaseScene {
  protected scene!: Scene;

  constructor(protected engine: Engine) { }

  abstract init(canvas: HTMLCanvasElement): Promise<Scene>;
  abstract update(deltaTime: number): void;
  abstract dispose(): void;

  getScene(): Scene {
    return this.scene;
  }
}