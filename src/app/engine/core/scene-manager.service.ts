// engine/core/scene-manager.service.ts
import { Injectable } from '@angular/core';
import { Engine } from '@babylonjs/core/Engines/engine';
import { GameScene } from '../base/game-scene';
import { EngineService } from './engine.service';

@Injectable({ providedIn: 'root' })
export class SceneManagerService {
  private currentSceneInstance?: GameScene;

  constructor(private engineService: EngineService) { }

  async loadScene(sceneClass: new (engine: Engine) => GameScene, canvas: HTMLCanvasElement): Promise<void> {
    if (this.currentSceneInstance) {
      this.currentSceneInstance.dispose();
    }

    const engine = this.engineService.getEngine();
    this.currentSceneInstance = new sceneClass(engine);

    await this.currentSceneInstance.init(canvas);

    engine.runRenderLoop(() => {
      const delta = engine.getDeltaTime();
      this.currentSceneInstance?.update(delta);
      this.currentSceneInstance?.getScene().render();
    });
  }
}