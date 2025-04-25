// engine/scenes/scene001.scene.ts
import { GameScene } from '../base/game-scene';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export class Scene001 extends GameScene {
  async init(canvas: HTMLCanvasElement): Promise<Scene> {
    this.scene = new Scene(this.engine);

    const camera = new ArcRotateCamera('Camera001', Math.PI / 2, Math.PI / 3, 8, new Vector3(0, 1, 0), this.scene);
    camera.attachControl(canvas, true);

    const light = new HemisphericLight('light001', new Vector3(0, 1, 0), this.scene);

    // 🌤 You can initialize weather, terrain, sky, etc. here specific to Scene001

    return this.scene;
  }

  update(deltaTime: number): void {
    // 🎮 Game loop logic per frame here (e.g., weather.update())
  }

  dispose(): void {
    this.scene.dispose();
  }
}