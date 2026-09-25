export type HazardMode = 'normal' | 'non-lethal' | 'frozen';

export interface DevSettings {
  enabled: boolean;
  hazardMode: HazardMode;
  godMode: boolean;
  disableSpikes: boolean;
  flyMode: boolean;
  infiniteJump: boolean;
  showHitboxes: boolean;
  showTileGrid: boolean;
  revealFullMap: boolean;
  timeScale: number;
  isPaused: boolean;
  skipTransitionAnimation: boolean;
}

export type DevSettingKey = keyof DevSettings;

export class DevManager {
  private static instance: DevManager | null = null;

  public enabled: boolean = false;
  public hazardMode: HazardMode = 'normal';
  public godMode: boolean = false;
  public disableSpikes: boolean = false;
  public flyMode: boolean = false;
  public infiniteJump: boolean = false;
  public showHitboxes: boolean = false;
  public showTileGrid: boolean = false;
  public revealFullMap: boolean = false;
  public timeScale: number = 1.0;
  public isPaused: boolean = false;
  public skipTransitionAnimation: boolean = false;

  // Single-frame step flag
  public stepFrameRequested: boolean = false;

  private listeners: Set<(key: DevSettingKey, value: unknown) => void> = new Set();
  private toggleListeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    this.initFromStorageAndUrl();
  }

  public static getInstance(): DevManager {
    if (!DevManager.instance) {
      DevManager.instance = new DevManager();
    }
    return DevManager.instance;
  }

  public saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('hyperfold_dev_mode', this.enabled ? 'true' : 'false');
      const settings = {
        enabled: this.enabled,
        hazardMode: this.hazardMode,
        godMode: this.godMode,
        disableSpikes: this.disableSpikes,
        flyMode: this.flyMode,
        infiniteJump: this.infiniteJump,
        showHitboxes: this.showHitboxes,
        showTileGrid: this.showTileGrid,
        timeScale: this.timeScale,
        isPaused: this.isPaused,
        skipTransitionAnimation: this.skipTransitionAnimation,
      };
      localStorage.setItem('hyperfold_dev_settings', JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }

  public loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const rawSettings = localStorage.getItem('hyperfold_dev_settings');
      if (rawSettings) {
        const s = JSON.parse(rawSettings);
        if (typeof s.enabled === 'boolean') this.enabled = s.enabled;
        if (s.hazardMode === 'normal' || s.hazardMode === 'non-lethal' || s.hazardMode === 'frozen') {
          this.hazardMode = s.hazardMode;
        }
        if (typeof s.godMode === 'boolean') this.godMode = s.godMode;
        if (typeof s.disableSpikes === 'boolean') this.disableSpikes = s.disableSpikes;
        if (typeof s.flyMode === 'boolean') this.flyMode = s.flyMode;
        if (typeof s.infiniteJump === 'boolean') this.infiniteJump = s.infiniteJump;
        if (typeof s.showHitboxes === 'boolean') this.showHitboxes = s.showHitboxes;
        if (typeof s.showTileGrid === 'boolean') this.showTileGrid = s.showTileGrid;
        if (typeof s.timeScale === 'number' && !isNaN(s.timeScale) && s.timeScale > 0) {
          this.timeScale = s.timeScale;
        }
        if (typeof s.isPaused === 'boolean') this.isPaused = s.isPaused;
        if (typeof s.skipTransitionAnimation === 'boolean') {
          this.skipTransitionAnimation = s.skipTransitionAnimation;
        }
      } else {
        const stored = localStorage.getItem('hyperfold_dev_mode') === 'true';
        if (stored) {
          this.enabled = true;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  public initFromStorageAndUrl(): void {
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('dev') || urlParams.has('debug')) {
          this.enabled = true;
        }
      } catch {
        // Ignore URL errors
      }
    }
  }

  public toggleEnabled(force?: boolean): boolean {
    this.enabled = force !== undefined ? force : !this.enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('hyperfold_dev_mode', this.enabled ? 'true' : 'false');
      }
    } catch {
      // Ignore storage errors
    }
    for (const listener of this.toggleListeners) {
      listener(this.enabled);
    }
    this.notifyChange('enabled', this.enabled);
    return this.enabled;
  }

  public setHazardMode(mode: HazardMode): void {
    this.hazardMode = mode;
    this.notifyChange('hazardMode', mode);
  }

  public toggleHazardDisabling(): void {
    // Cycles between normal -> non-lethal -> frozen -> normal
    if (this.hazardMode === 'normal') {
      this.setHazardMode('non-lethal');
    } else if (this.hazardMode === 'non-lethal') {
      this.setHazardMode('frozen');
    } else {
      this.setHazardMode('normal');
    }
  }

  public setGodMode(val: boolean): void {
    this.godMode = val;
    this.notifyChange('godMode', val);
  }

  public toggleGodMode(): boolean {
    this.setGodMode(!this.godMode);
    return this.godMode;
  }

  public setDisableSpikes(val: boolean): void {
    this.disableSpikes = val;
    this.notifyChange('disableSpikes', val);
  }

  public toggleDisableSpikes(): boolean {
    this.setDisableSpikes(!this.disableSpikes);
    return this.disableSpikes;
  }

  public setFlyMode(val: boolean): void {
    this.flyMode = val;
    this.notifyChange('flyMode', val);
  }

  public toggleFlyMode(): boolean {
    this.setFlyMode(!this.flyMode);
    return this.flyMode;
  }

  public setInfiniteJump(val: boolean): void {
    this.infiniteJump = val;
    this.notifyChange('infiniteJump', val);
  }

  public toggleInfiniteJump(): boolean {
    this.setInfiniteJump(!this.infiniteJump);
    return this.infiniteJump;
  }

  public setShowHitboxes(val: boolean): void {
    this.showHitboxes = val;
    this.notifyChange('showHitboxes', val);
  }

  public toggleShowHitboxes(): boolean {
    this.setShowHitboxes(!this.showHitboxes);
    return this.showHitboxes;
  }

  public setShowTileGrid(val: boolean): void {
    this.showTileGrid = val;
    this.notifyChange('showTileGrid', val);
  }

  public toggleShowTileGrid(): boolean {
    this.setShowTileGrid(!this.showTileGrid);
    return this.showTileGrid;
  }

  public setRevealFullMap(val: boolean): void {
    this.revealFullMap = val;
    this.notifyChange('revealFullMap', val);
  }

  public toggleRevealFullMap(): boolean {
    this.setRevealFullMap(!this.revealFullMap);
    return this.revealFullMap;
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(10.0, scale));
    this.notifyChange('timeScale', this.timeScale);
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.notifyChange('isPaused', paused);
  }

  public togglePaused(): boolean {
    this.setPaused(!this.isPaused);
    return this.isPaused;
  }

  public stepFrame(): void {
    this.stepFrameRequested = true;
  }

  public setSkipTransitionAnimation(val: boolean): void {
    this.skipTransitionAnimation = val;
    this.notifyChange('skipTransitionAnimation', val);
  }

  public toggleSkipTransitionAnimation(): boolean {
    this.setSkipTransitionAnimation(!this.skipTransitionAnimation);
    return this.skipTransitionAnimation;
  }

  public subscribe(callback: (key: DevSettingKey, value: unknown) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public onToggle(callback: (enabled: boolean) => void): () => void {
    this.toggleListeners.add(callback);
    return () => this.toggleListeners.delete(callback);
  }

  private notifyChange(key: DevSettingKey, value: unknown): void {
    this.saveToStorage();
    for (const listener of this.listeners) {
      listener(key, value);
    }
  }

  public toggle(force?: boolean): boolean {
    return this.toggleEnabled(force);
  }

  public isDynamicHazardLethal(): boolean {
    if (!this.enabled) return true;
    if (this.godMode) return false;
    return this.hazardMode === 'normal';
  }

  public isDynamicHazardFrozen(): boolean {
    if (!this.enabled) return false;
    return this.hazardMode === 'frozen';
  }

  public isSpikeLethal(): boolean {
    if (!this.enabled) return true;
    if (this.godMode || this.disableSpikes) return false;
    return true;
  }

  public isHazardNormal(): boolean {
    return this.hazardMode === 'normal';
  }

  public isHazardNonLethal(): boolean {
    return this.hazardMode === 'non-lethal';
  }

  public isHazardFrozen(): boolean {
    return this.hazardMode === 'frozen';
  }

  public hasActiveModifiers(): boolean {
    return (
      this.hazardMode !== 'normal' ||
      this.godMode ||
      this.flyMode ||
      this.disableSpikes ||
      this.infiniteJump ||
      this.showHitboxes ||
      this.showTileGrid ||
      this.isPaused ||
      this.timeScale !== 1.0
    );
  }

  public resetToDefaults(): void {
    this.hazardMode = 'normal';
    this.godMode = false;
    this.disableSpikes = false;
    this.flyMode = false;
    this.infiniteJump = false;
    this.showHitboxes = false;
    this.showTileGrid = false;
    this.revealFullMap = false;
    this.timeScale = 1.0;
    this.isPaused = false;
    this.stepFrameRequested = false;
    this.skipTransitionAnimation = false;
    this.saveToStorage();
  }
}

