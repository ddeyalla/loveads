// Canvas utility functions

/**
 * Snaps a value to the nearest grid point
 * @param value The value to snap
 * @param gridSize The size of the grid
 * @param threshold The distance threshold for snapping
 * @returns The snapped value
 */
export function snapToGrid(value: number, gridSize = 20, threshold = 10): number {
  const remainder = value % gridSize;
  
  // If we're close to a grid line, snap to it
  if (remainder < threshold) {
    return value - remainder;
  } else if (gridSize - remainder < threshold) {
    return value + (gridSize - remainder);
  }
  
  // Otherwise, return the original value
  return value;
}

/**
 * History stack for undo/redo functionality
 */
export class HistoryStack<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private maxSize: number;
  
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }
  
  /**
   * Push a new state to the history stack
   * @param state The state to push
   */
  push(state: T): void {
    // Add to undo stack
    this.undoStack.push(JSON.parse(JSON.stringify(state)));
    
    // Clear redo stack when a new action is performed
    this.redoStack = [];
    
    // Limit stack size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }
  
  /**
   * Undo the last action and return the previous state
   * @returns The previous state or null if no more undo actions
   */
  undo(currentState: T): T | null {
    if (this.undoStack.length <= 1) return null;
    
    // Save current state to redo stack before going back
    this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
    
    // Remove current state from undo stack
    this.undoStack.pop();
    
    // Return the previous state
    return this.undoStack.length > 0 ? 
      JSON.parse(JSON.stringify(this.undoStack[this.undoStack.length - 1])) : null;
  }
  
  /**
   * Redo the previously undone action
   * @returns The next state or null if no more redo actions
   */
  redo(): T | null {
    if (this.redoStack.length === 0) return null;
    
    // Get the last redo state
    const nextState = this.redoStack.pop() as T;
    
    // Add it back to undo stack
    this.undoStack.push(JSON.parse(JSON.stringify(nextState)));
    
    // Return the state
    return JSON.parse(JSON.stringify(nextState));
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 1;
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Clear the history stack
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

/**
 * Get visible objects based on viewport
 * @param objects Array of objects with position and dimension data
 * @param viewport Current viewport information
 * @returns Array of objects that are visible in the viewport
 */
export function getVisibleObjects<T extends { x: number; y: number; width: number; height: number }>(
  objects: T[],
  viewport: { x: number; y: number; width: number; height: number; zoom: number }
): T[] {
  // Calculate viewport bounds in world coordinates
  const viewportLeft = viewport.x / viewport.zoom;
  const viewportTop = viewport.y / viewport.zoom;
  const viewportRight = viewportLeft + viewport.width / viewport.zoom;
  const viewportBottom = viewportTop + viewport.height / viewport.zoom;
  
  // Filter objects that are visible in the viewport
  return objects.filter(object => {
    const objectRight = object.x + object.width;
    const objectBottom = object.y + object.height;
    
    // Check if the object is visible in the viewport
    return (
      objectRight >= viewportLeft &&
      object.x <= viewportRight &&
      objectBottom >= viewportTop &&
      object.y <= viewportBottom
    );
  });
}
