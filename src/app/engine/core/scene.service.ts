import { Injectable } from '@angular/core';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

@Injectable({ providedIn: 'root' })
export class SceneService {
  private scene!: Scene;

  createScene(canvas: HTMLCanvasElement, engine: Engine): void {
    this.scene = new Scene(engine);

    const camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 4, 10, Vector3.Zero(), this.scene);
    camera.attachControl(canvas, true);

    const light = new HemisphericLight('light1', new Vector3(1, 1, 0), this.scene);

    engine.runRenderLoop(() => {
      this.scene.render();
    });

    this.scene.debugLayer.show(); // 🎯 Toggle off in prod
  }

  getScene(): Scene {
    return this.scene;
  }
}
