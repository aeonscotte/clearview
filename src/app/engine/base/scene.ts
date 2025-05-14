// src/app/engine/base/scene.ts
import type { Scene } from '@babylonjs/core';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { EngineService } from '../core/engine.service';
import { Injectable } from '@angular/core';

@Injectable()
export abstract class BaseScene {
  protected scene!: Scene;
  protected engine!: Engine;

  constructor(engineService: EngineService) {
    this.engine = engineService.getEngine();
  }

  abstract init(canvas: HTMLCanvasElement): Promise<Scene>;
  abstract update(deltaTime: number): void;
  abstract dispose(): void;

  getScene(): Scene {
    return this.scene;
  }
}