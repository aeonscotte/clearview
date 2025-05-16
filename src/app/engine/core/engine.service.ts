// src/app/engine/core/engine.service.ts
import { Injectable } from '@angular/core';
import { Engine } from '@babylonjs/core/Engines/engine';

@Injectable({ providedIn: 'root' })
export class EngineService {
    private engine: Engine | null = null;

    createEngine(canvas: HTMLCanvasElement): Engine {
        // Dispose existing engine if it exists
        if (this.engine && !this.engine.isDisposed) {
            this.engine.dispose();
        }

        // Create fresh engine
        this.engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            disableWebGL2Support: false,
        });

        return this.engine;
    }

    getEngine(): Engine {
        if (!this.engine) {
            throw new Error('Engine not initialized. Call createEngine first.');
        }
        return this.engine;
    }

    hasValidEngine(): boolean {
        return !!this.engine && !this.engine.isDisposed;
    }

    cleanUp(): void {
        if (this.engine && !this.engine.isDisposed) {
            this.engine.stopRenderLoop();
            this.engine.dispose();
        }
        this.engine = null;
    }
}