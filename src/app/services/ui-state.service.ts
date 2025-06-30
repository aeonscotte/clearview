import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private mainMenuVisibleSubject = new BehaviorSubject<boolean>(true);
  private settingsVisibleSubject = new BehaviorSubject<boolean>(false);

  get mainMenuVisible$(): Observable<boolean> {
    return this.mainMenuVisibleSubject.asObservable();
  }

  get settingsVisible$(): Observable<boolean> {
    return this.settingsVisibleSubject.asObservable();
  }

  showMainMenu(): void {
    this.mainMenuVisibleSubject.next(true);
  }

  hideMainMenu(): void {
    this.mainMenuVisibleSubject.next(false);
  }

  showSettings(): void {
    this.settingsVisibleSubject.next(true);
  }

  hideSettings(): void {
    this.settingsVisibleSubject.next(false);
  }
}
