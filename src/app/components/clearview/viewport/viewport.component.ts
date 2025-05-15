// src/app/components/viewport/viewport.component.ts
import { Component, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EngineService } from '../../../engine/core/engine.service';
import { SceneManagerService } from '../../../engine/core/scene-manager.service';
import { Scene001 } from '../../../engine/scenes/scene001.scene';
import { GuiService } from '../../../engine/core/gui.service';
import { PauseMenuComponent } from '../../ui/pause-menu/pause-menu.component';

@Component({
  selector: 'clearview-viewport',
  standalone: true,
  imports: [CommonModule, PauseMenuComponent], // Add PauseMenuComponent to imports
  templateUrl: './viewport.component.html',
  styleUrls: ['./viewport.component.less'],
})
export class ViewportComponent implements AfterViewInit {
  @ViewChild('renderCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private engineService: EngineService,
    private sceneManager: SceneManagerService,
    private guiService: GuiService
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    this.engineService.createEngine(canvas);
    
    // Fix the scene initialization by accessing the Scene instance correctly
    await this.sceneManager.loadScene(Scene001, canvas);
    
    // Get the active scene from the loaded scene instance
    const scene = this.sceneManager.getCurrentScene();
    
    // Initialize GUI service with scene reference
    if (scene) {
      this.guiService.initialize(scene);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    // Toggle pause menu on ESC key
    if (event.key === 'Escape') {
      this.guiService.togglePause();
    }
  }
}