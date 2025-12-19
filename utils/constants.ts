/**
 * Centralized constants for the MeasureLab application.
 * Avoids magic numbers scattered throughout the codebase.
 */

export const CANVAS = {
  /** Minimum drag distance (in pixels) before selection rectangle appears */
  DRAG_THRESHOLD: 5,
  /** Minimum zoom scale (10% of original) */
  MIN_SCALE: 0.1,
  /** Maximum zoom scale (500% of original) */
  MAX_SCALE: 5,
  /** Zoom in factor (10% increase per wheel step) */
  ZOOM_FACTOR_IN: 1.1,
  /** Zoom out factor (10% decrease per wheel step) */
  ZOOM_FACTOR_OUT: 0.9,
  /** Size of count measurement markers (pixels) */
  COUNT_SIZE: 16,
  /** Radius of measurement endpoint circles (pixels) */
  ENDPOINT_RADIUS: 4,
  /** Distance threshold for closing area polygon (pixels) */
  CLOSE_POLYGON_THRESHOLD: 10,
  /** Pan drag threshold to distinguish from clicks (pixels) */
  PAN_DRAG_THRESHOLD: 10,
} as const;

export const PERFORMANCE = {
  /** Target frame time for 60fps (milliseconds) */
  FRAME_TIME_MS: 16,
  /** Throttle interval for mouse move events (milliseconds) */
  MOUSE_MOVE_THROTTLE_MS: 16,
  /** Debounce delay for selection updates (milliseconds) */
  SELECTION_DEBOUNCE_MS: 50,
} as const;

export const STORAGE = {
  /** Delay before extracting PDF canvas (milliseconds) */
  PDF_CANVAS_EXTRACTION_DELAY: 500,
} as const;

export const MEASUREMENT = {
  /** Default opacity for selected measurements */
  SELECTED_OPACITY: 0.9,
  /** Default opacity for length measurements */
  LENGTH_OPACITY: 0.6,
  /** Default opacity for area measurements */
  AREA_OPACITY: 0.4,
  /** Stroke width multiplier for selected measurements */
  SELECTED_STROKE_MULTIPLIER: 1.8,
} as const;
