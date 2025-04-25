import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { EngineService } from './../../../engine/core/engine.service';
import { SceneService } from './../../../engine/core/scene.service';

@Component({
  selector: 'clearview-viewport',
  templateUrl: './viewport.component.html',
  styleUrls: ['./viewport.component.css'],
})
export class ViewportComponent implements AfterViewInit {
  @ViewChild('renderCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private engineService: EngineService,
    private sceneService: SceneService
  ) { }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.engineService.createEngine(canvas);
    this.sceneService.createScene(canvas, this.engineService.getEngine());
  }
}
