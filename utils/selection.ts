/**
 * Selection handling utilities for managing measurement selections.
 */

/**
 * Toggle a measurement ID in a selection set.
 * If the ID is already selected, remove it; otherwise add it.
 */
export function toggleSelection(
  currentSelection: Set<string>,
  measurementId: string
): Set<string> {
  const newSelection = new Set(currentSelection);
  if (newSelection.has(measurementId)) {
    newSelection.delete(measurementId);
  } else {
    newSelection.add(measurementId);
  }
  return newSelection;
}

/**
 * Update selection based on modifier keys.
 * - Shift/Ctrl/Cmd: toggle selection
 * - No modifier: replace selection with single item
 */
export function updateSelectionWithModifiers(
  currentSelection: Set<string>,
  measurementId: string,
  shiftKey: boolean,
  ctrlKey: boolean,
  metaKey: boolean
): Set<string> {
  if (shiftKey || ctrlKey || metaKey) {
    return toggleSelection(currentSelection, measurementId);
  } else {
    return new Set([measurementId]);
  }
}

/**
 * Add multiple measurement IDs to the current selection.
 */
export function addToSelection(
  currentSelection: Set<string>,
  measurementIds: string[]
): Set<string> {
  const newSelection = new Set(currentSelection);
  measurementIds.forEach(id => newSelection.add(id));
  return newSelection;
}

/**
 * Remove multiple measurement IDs from the current selection.
 */
export function removeFromSelection(
  currentSelection: Set<string>,
  measurementIds: string[]
): Set<string> {
  const newSelection = new Set(currentSelection);
  measurementIds.forEach(id => newSelection.delete(id));
  return newSelection;
}
