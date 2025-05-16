// src/app/components/ui/loading-indicator/loading-indicator.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AssetManagerService } from '../../../engine/core/asset-manager.service';

@Component({
    selector: 'app-loading-indicator',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './loading-indicator.component.html',
    styleUrls: ['./loading-indicator.component.less']
})
export class LoadingIndicatorComponent implements OnInit, OnDestroy {
    isLoading = true; // Start with loading true to avoid the error
    progressPercent = 0;
    progressText = "Preparing assets...";
    private loadingSubscription?: Subscription;

    constructor(
        private assetManager: AssetManagerService,
        private cdr: ChangeDetectorRef,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        // Use NgZone to handle the async subscription
        this.ngZone.runOutsideAngular(() => {
            // We need a slight delay to avoid the ExpressionChangedAfterItHasBeenCheckedError
            setTimeout(() => {
                this.loadingSubscription = this.assetManager.getLoadingProgress().subscribe(progress => {
                    // When we get the first update from the asset manager
                    this.isLoading = this.assetManager.isLoading();
                    this.progressPercent = Math.round(progress * 100);

                    if (this.progressPercent === 100) {
                        this.progressText = "Scene ready!";

                        // Automatically hide the loader after a short delay when complete
                        if (!this.isLoading) {
                            setTimeout(() => {
                                this.ngZone.run(() => {
                                    this.cdr.markForCheck();
                                });
                            }, 500);
                        }
                    } else {
                        this.progressText = `Loading assets... ${this.progressPercent}%`;
                    }

                    // Run change detection properly
                    this.ngZone.run(() => {
                        this.cdr.detectChanges();
                    });
                });
            }, 0);
        });
    }

    ngOnDestroy(): void {
        if (this.loadingSubscription) {
            this.loadingSubscription.unsubscribe();
        }
    }
}