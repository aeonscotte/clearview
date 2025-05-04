// src/app/engine/core/engine.service.ts
import { Injectable } from '@angular/core';
import { Engine } from '@babylonjs/core/Engines/engine';

@Injectable({ providedIn: 'root' })
export class EngineService {
  private engine!: Engine;

  createEngine(canvas: HTMLCanvasElement): void {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    });
  }

  getEngine(): Engine {
    return this.engine;
  }
}