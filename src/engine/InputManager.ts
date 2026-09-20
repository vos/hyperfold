export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  dashJustPressed: boolean;
  restartJustPressed: boolean;
}

export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private gamepadConnected: boolean = false;
  private prevGamepadButtons: boolean[] = [];

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('gamepadconnected', () => {
      this.gamepadConnected = true;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
    });
  }

  public isGamepadActive(): boolean {
    return this.gamepadConnected;
  }


  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent scrolling for game controls
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!this.keysDown.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keysDown.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code);
  };

  public update(): InputState {
    let left = this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA');
    let right = this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD');
    let up = this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW');
    let down = this.keysDown.has('ArrowDown') || this.keysDown.has('KeyS');
    let jump = this.keysDown.has('Space') || this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW');
    let jumpJustPressed = this.keysJustPressed.has('Space') || this.keysJustPressed.has('ArrowUp') || this.keysJustPressed.has('KeyW');
    let dashJustPressed = this.keysJustPressed.has('ShiftLeft') || this.keysJustPressed.has('ShiftRight') || this.keysJustPressed.has('KeyJ');
    let restartJustPressed = this.keysJustPressed.has('KeyR');

    // Poll Gamepad if available
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (gp) {
        const threshold = 0.3;
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;

        if (axisX < -threshold || gp.buttons[14]?.pressed) left = true;
        if (axisX > threshold || gp.buttons[15]?.pressed) right = true;
        if (axisY < -threshold || gp.buttons[12]?.pressed) up = true;
        if (axisY > threshold || gp.buttons[13]?.pressed) down = true;

        const gpJump = !!gp.buttons[0]?.pressed; // A / Cross
        const gpDash = !!gp.buttons[2]?.pressed || !!gp.buttons[7]?.pressed; // X / Square or RT

        if (gpJump) jump = true;
        if (gpJump && !this.prevGamepadButtons[0]) jumpJustPressed = true;
        if (gpDash && !this.prevGamepadButtons[2]) dashJustPressed = true;

        this.prevGamepadButtons[0] = gpJump;
        this.prevGamepadButtons[2] = gpDash;
      }
    }

    // Clear one-frame flags
    this.keysJustPressed.clear();

    return {
      left,
      right,
      up,
      down,
      jump,
      jumpJustPressed,
      dashJustPressed,
      restartJustPressed,
    };
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
