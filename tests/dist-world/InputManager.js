"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputManager = void 0;
class InputManager {
    keysDown = new Set();
    keysJustPressed = new Set();
    gamepadConnected = false;
    prevGamepadButtons = [];
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
    isGamepadActive() {
        return this.gamepadConnected;
    }
    handleKeyDown = (e) => {
        // Prevent scrolling for game controls
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
        if (!this.keysDown.has(e.code)) {
            this.keysJustPressed.add(e.code);
        }
        this.keysDown.add(e.code);
    };
    handleKeyUp = (e) => {
        this.keysDown.delete(e.code);
    };
    update() {
        let left = this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA');
        let right = this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD');
        let up = this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW');
        let down = this.keysDown.has('ArrowDown') || this.keysDown.has('KeyS');
        let jump = this.keysDown.has('Space') || this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW');
        let jumpJustPressed = this.keysJustPressed.has('Space') || this.keysJustPressed.has('ArrowUp') || this.keysJustPressed.has('KeyW');
        let dashJustPressed = this.keysJustPressed.has('ShiftLeft') || this.keysJustPressed.has('ShiftRight') || this.keysJustPressed.has('KeyJ');
        let restartJustPressed = this.keysJustPressed.has('KeyR');
        // Camera orbit inputs
        let cameraOrbitX = 0;
        let cameraOrbitY = 0;
        let cameraResetJustPressed = this.keysJustPressed.has('KeyV');
        // Keyboard camera orbit support (I/J/K/L or numpad)
        if (this.keysDown.has('KeyI'))
            cameraOrbitY -= 1.0;
        if (this.keysDown.has('KeyK'))
            cameraOrbitY += 1.0;
        if (this.keysDown.has('KeyJ'))
            cameraOrbitX -= 1.0;
        if (this.keysDown.has('KeyL'))
            cameraOrbitX += 1.0;
        // Poll Gamepad if available
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            const gp = gamepads[0];
            if (gp) {
                const threshold = 0.3;
                const axisX = gp.axes[0] || 0;
                const axisY = gp.axes[1] || 0;
                if (axisX < -threshold || gp.buttons[14]?.pressed)
                    left = true;
                if (axisX > threshold || gp.buttons[15]?.pressed)
                    right = true;
                if (axisY < -threshold || gp.buttons[12]?.pressed)
                    up = true;
                if (axisY > threshold || gp.buttons[13]?.pressed)
                    down = true;
                const gpJump = !!gp.buttons[0]?.pressed; // A / Cross
                const gpDash = !!gp.buttons[2]?.pressed || !!gp.buttons[7]?.pressed; // X / Square or RT
                if (gpJump)
                    jump = true;
                if (gpJump && !this.prevGamepadButtons[0])
                    jumpJustPressed = true;
                if (gpDash && !this.prevGamepadButtons[2])
                    dashJustPressed = true;
                this.prevGamepadButtons[0] = gpJump;
                this.prevGamepadButtons[2] = gpDash;
                // Right thumbstick for 3D camera orbit (axes 2 & 3)
                const deadzone = 0.15;
                const rStickX = gp.axes[2] || 0;
                const rStickY = gp.axes[3] || 0;
                if (Math.abs(rStickX) > deadzone) {
                    cameraOrbitX = (rStickX - Math.sign(rStickX) * deadzone) / (1 - deadzone);
                }
                if (Math.abs(rStickY) > deadzone) {
                    cameraOrbitY = (rStickY - Math.sign(rStickY) * deadzone) / (1 - deadzone);
                }
                // R3 (Right stick click = button 11) or Select (button 8/9) to reset camera
                const gpReset = !!gp.buttons[11]?.pressed || !!gp.buttons[9]?.pressed;
                if (gpReset && !this.prevGamepadButtons[11]) {
                    cameraResetJustPressed = true;
                }
                this.prevGamepadButtons[11] = gpReset;
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
            cameraOrbitX,
            cameraOrbitY,
            cameraResetJustPressed,
        };
    }
    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}
exports.InputManager = InputManager;
