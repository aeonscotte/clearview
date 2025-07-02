import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EngineService } from '../../../engine/core/engine.service';

@Component({
    selector: 'app-fps-counter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './fps-counter.component.html',
    styleUrls: ['./fps-counter.component.less']
})
export class FpsCounterComponent implements AfterViewInit, OnDestroy {
    fps = 0;
    private intervalId: any;

    constructor(private engineService: EngineService) {}

    ngAfterViewInit(): void {
        const engine = this.engineService.getEngine();
        this.intervalId = setInterval(() => {
            this.fps = Math.round(engine.getFps());
        }, 500);
    }

    ngOnDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
