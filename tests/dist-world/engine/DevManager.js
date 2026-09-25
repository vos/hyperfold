"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevManager = void 0;

class DevManager {
  static instance = null;

  enabled = false;
  hazardMode = 'normal';
  godMode = false;
  disableSpikes = false;
  flyMode = false;
  infiniteJump = false;
  showHitboxes = false;
  showTileGrid = false;
  revealFullMap = false;
  timeScale = 1.0;
  isPaused = false;
  skipTransitionAnimation = false;
  stepFrameRequested = false;

  listeners = new Set();
  toggleListeners = new Set();

  constructor() {
    this.initFromStorageAndUrl();
  }

  static getInstance() {
    if (!DevManager.instance) {
      DevManager.instance = new DevManager();
    }
    return DevManager.instance;
  }

  saveToStorage() {
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
      // Ignore
    }
  }

  loadFromStorage() {
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
      // Ignore
    }
  }

  initFromStorageAndUrl() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('dev') || urlParams.has('debug')) {
          this.enabled = true;
        }
      } catch {
        // Ignore
      }
    }
  }

  toggleEnabled(force) {
    this.enabled = force !== undefined ? force : !this.enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('hyperfold_dev_mode', this.enabled ? 'true' : 'false');
      }
    } catch {
      // Ignore
    }
    for (const listener of this.toggleListeners) {
      listener(this.enabled);
    }
    this.notifyChange('enabled', this.enabled);
    return this.enabled;
  }

  setHazardMode(mode) {
    this.hazardMode = mode;
    this.notifyChange('hazardMode', mode);
  }

  toggleHazardDisabling() {
    if (this.hazardMode === 'normal') {
      this.setHazardMode('non-lethal');
    } else if (this.hazardMode === 'non-lethal') {
      this.setHazardMode('frozen');
    } else {
      this.setHazardMode('normal');
    }
  }

  setGodMode(val) {
    this.godMode = val;
    this.notifyChange('godMode', val);
  }

  toggleGodMode() {
    this.setGodMode(!this.godMode);
    return this.godMode;
  }

  setDisableSpikes(val) {
    this.disableSpikes = val;
    this.notifyChange('disableSpikes', val);
  }

  toggleDisableSpikes() {
    this.setDisableSpikes(!this.disableSpikes);
    return this.disableSpikes;
  }

  setFlyMode(val) {
    this.flyMode = val;
    this.notifyChange('flyMode', val);
  }

  toggleFlyMode() {
    this.setFlyMode(!this.flyMode);
    return this.flyMode;
  }

  setInfiniteJump(val) {
    this.infiniteJump = val;
    this.notifyChange('infiniteJump', val);
  }

  toggleInfiniteJump() {
    this.setInfiniteJump(!this.infiniteJump);
    return this.infiniteJump;
  }

  setShowHitboxes(val) {
    this.showHitboxes = val;
    this.notifyChange('showHitboxes', val);
  }

  toggleShowHitboxes() {
    this.setShowHitboxes(!this.showHitboxes);
    return this.showHitboxes;
  }

  setShowTileGrid(val) {
    this.showTileGrid = val;
    this.notifyChange('showTileGrid', val);
  }

  toggleShowTileGrid() {
    this.setShowTileGrid(!this.showTileGrid);
    return this.showTileGrid;
  }

  setRevealFullMap(val) {
    this.revealFullMap = val;
    this.notifyChange('revealFullMap', val);
  }

  toggleRevealFullMap() {
    this.setRevealFullMap(!this.revealFullMap);
    return this.revealFullMap;
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(0.1, Math.min(10.0, scale));
    this.notifyChange('timeScale', this.timeScale);
  }

  setPaused(paused) {
    this.isPaused = paused;
    this.notifyChange('isPaused', paused);
  }

  togglePaused() {
    this.setPaused(!this.isPaused);
    return this.isPaused;
  }

  stepFrame() {
    this.stepFrameRequested = true;
  }

  setSkipTransitionAnimation(val) {
    this.skipTransitionAnimation = val;
    this.notifyChange('skipTransitionAnimation', val);
  }

  toggleSkipTransitionAnimation() {
    this.setSkipTransitionAnimation(!this.skipTransitionAnimation);
    return this.skipTransitionAnimation;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onToggle(callback) {
    this.toggleListeners.add(callback);
    return () => this.toggleListeners.delete(callback);
  }

  notifyChange(key, value) {
    this.saveToStorage();
    for (const listener of this.listeners) {
      listener(key, value);
    }
  }

  toggle(force) {
    return this.toggleEnabled(force);
  }

  isDynamicHazardLethal() {
    if (!this.enabled) return true;
    if (this.godMode) return false;
    return this.hazardMode === 'normal';
  }

  isDynamicHazardFrozen() {
    if (!this.enabled) return false;
    return this.hazardMode === 'frozen';
  }

  isSpikeLethal() {
    if (!this.enabled) return true;
    if (this.godMode || this.disableSpikes) return false;
    return true;
  }

  isHazardNormal() {
    return this.hazardMode === 'normal';
  }

  isHazardNonLethal() {
    return this.hazardMode === 'non-lethal';
  }

  isHazardFrozen() {
    return this.hazardMode === 'frozen';
  }

  hasActiveModifiers() {
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

  resetToDefaults() {
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
exports.DevManager = DevManager;
