// src/app/engine/core/scene-manager.service.ts
import { Injectable, Injector, Type } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { BaseScene } from '../base/scene';
import { EngineService } from './engine.service';

@Injectable({ providedIn: 'root' })
export class SceneManagerService {
  private currentSceneInstance?: BaseScene;

  constructor(
    private engineService: EngineService,
    private injector: Injector
  ) { }

  async loadScene(sceneType: Type<BaseScene>, canvas: HTMLCanvasElement): Promise<void> {
    if (this.currentSceneInstance) {
      this.currentSceneInstance.dispose();
    }

    // Get scene instance from Angular DI system
    this.currentSceneInstance = this.injector.get(sceneType);
    
    await this.currentSceneInstance!.init(canvas);

    const engine = this.engineService.getEngine();
    engine.runRenderLoop(() => {
      const delta = engine.getDeltaTime();
      this.currentSceneInstance?.update(delta);
      this.currentSceneInstance?.getScene().render();
    });
  }

  // Add method to get the current scene
  getCurrentScene(): Scene | undefined {
    return this.currentSceneInstance?.getScene();
  }
}