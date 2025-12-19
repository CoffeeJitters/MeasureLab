/**
 * Coordinate conversion utilities for converting between stage coordinates,
 * image coordinates, and DOM pixel coordinates.
 */

export interface ImageOffset {
  x: number;
  y: number;
}

export interface StageSize {
  width: number;
  height: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface StagePosition {
  x: number;
  y: number;
}

/**
 * Calculate the image offset within stage coordinates.
 * The image is centered within the stage, accounting for scale.
 */
export function calculateImageOffset(
  stageSize: StageSize,
  imageSize: ImageSize,
  scale: number
): ImageOffset {
  const scaledWidth = imageSize.width * scale;
  const scaledHeight = imageSize.height * scale;
  return {
    x: (stageSize.width - scaledWidth) / 2 / scale,
    y: (stageSize.height - scaledHeight) / 2 / scale,
  };
}

/**
 * Convert pointer position from DOM pixels to image coordinates.
 * Accounts for stage scale and pan (position offset).
 */
export function pointerToImageCoordinates(
  pointerX: number,
  pointerY: number,
  stagePosition: StagePosition,
  scale: number,
  imageOffset: ImageOffset
): { x: number; y: number } {
  // Convert pointer from DOM pixels to stage coordinates (accounting for pan and zoom)
  const stageX = (pointerX - stagePosition.x) / scale;
  const stageY = (pointerY - stagePosition.y) / scale;
  
  // Convert to image coordinates
  return {
    x: stageX - imageOffset.x,
    y: stageY - imageOffset.y,
  };
}

/**
 * Convert image coordinates to stage coordinates.
 */
export function imageToStageCoordinates(
  imageX: number,
  imageY: number,
  imageOffset: ImageOffset
): { x: number; y: number } {
  return {
    x: imageX + imageOffset.x,
    y: imageY + imageOffset.y,
  };
}
