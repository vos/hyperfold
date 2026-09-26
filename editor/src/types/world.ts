/**
 * Visual Editor UI Type Definitions for Hyperfold
 * Re-exports canonical domain models from shared and defines editor-only interaction states.
 */

export * from '../../../shared/index.ts';

/**
 * Active brush/manipulation tool in the editor palette.
 */
export type EditorTool =
  | 'pencil'
  | 'line'
  | 'rect'
  | 'fill'
  | 'eraser'
  | 'eyedropper'
  | 'select';

/**
 * Union representing the currently selected entity in the visual editor canvas or inspector.
 */
export type SelectedEntity =
  | { type: 'spawn' }
  | { type: 'collectible'; id: string }
  | { type: 'movingPlatform'; id: string }
  | { type: 'laserBarrier'; id: string }
  | { type: 'laserTurret'; id: string }
  | { type: 'portal'; id: string }
  | { type: 'bouncePad'; row: number; col: number }
  | null;

/**
 * Sector diagnostic validation issue discovered by the editor linter.
 */
export interface DiagnosticIssue {
  /** Unique issue identifier */
  id: string;
  /** Severity level of the issue */
  severity: 'error' | 'warning' | 'info';
  /** Optional room identifier where the diagnostic occurred */
  roomId?: string;
  /** User-facing explanation of the problem */
  message: string;
  /** Optional label for an automated fix button */
  actionLabel?: string;
  /** Optional automated fix callback function */
  onFix?: () => void;
}
