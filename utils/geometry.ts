/**
 * Geometry calculation utilities for measurement and selection operations.
 * Extracted from Viewer.tsx for better testability and reusability.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if a point is inside a rectangle.
 * Handles negative width/height by normalizing the rectangle.
 */
export function pointInRect(
  point: Point,
  rect: Rect
): boolean {
  const minX = Math.min(rect.x, rect.x + rect.width);
  const maxX = Math.max(rect.x, rect.x + rect.width);
  const minY = Math.min(rect.y, rect.y + rect.height);
  const maxY = Math.max(rect.y, rect.y + rect.height);
  
  // Use inclusive boundaries - points exactly on the edge should be included
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

/**
 * Check if a line segment intersects with a rectangle.
 * Handles edge cases including co-linear lines and lines on rectangle edges.
 */
export function lineIntersectsRect(
  p1: Point,
  p2: Point,
  rect: Rect
): boolean {
  // Normalize rectangle to handle negative width/height
  const minX = Math.min(rect.x, rect.x + rect.width);
  const maxX = Math.max(rect.x, rect.x + rect.width);
  const minY = Math.min(rect.y, rect.y + rect.height);
  const maxY = Math.max(rect.y, rect.y + rect.height);
  
  // Check if either endpoint is inside
  if (pointInRect(p1, rect) || pointInRect(p2, rect)) {
    return true;
  }
  
  // Check if line segment lies exactly on a rectangle edge (co-linear case)
  const TOLERANCE = 0.001;
  const isOnTopEdge = Math.abs(p1.y - minY) < TOLERANCE && 
                      Math.abs(p2.y - minY) < TOLERANCE && 
                      ((p1.x >= minX && p1.x <= maxX) || (p2.x >= minX && p2.x <= maxX) || 
                       (p1.x <= minX && p2.x >= maxX) || (p2.x <= minX && p1.x >= maxX));
  const isOnBottomEdge = Math.abs(p1.y - maxY) < TOLERANCE && 
                         Math.abs(p2.y - maxY) < TOLERANCE && 
                         ((p1.x >= minX && p1.x <= maxX) || (p2.x >= minX && p2.x <= maxX) || 
                          (p1.x <= minX && p2.x >= maxX) || (p2.x <= minX && p1.x >= maxX));
  const isOnLeftEdge = Math.abs(p1.x - minX) < TOLERANCE && 
                       Math.abs(p2.x - minX) < TOLERANCE && 
                       ((p1.y >= minY && p1.y <= maxY) || (p2.y >= minY && p2.y <= maxY) || 
                        (p1.y <= minY && p2.y >= maxY) || (p2.y <= minY && p1.y >= maxY));
  const isOnRightEdge = Math.abs(p1.x - maxX) < TOLERANCE && 
                        Math.abs(p2.x - maxX) < TOLERANCE && 
                        ((p1.y >= minY && p1.y <= maxY) || (p2.y >= minY && p2.y <= maxY) || 
                         (p1.y <= minY && p2.y >= maxY) || (p2.y <= minY && p1.y >= maxY));
  
  if (isOnTopEdge || isOnBottomEdge || isOnLeftEdge || isOnRightEdge) {
    return true;
  }
  
  // Check if line intersects rectangle edges
  const edges = [
    { p1: { x: minX, y: minY }, p2: { x: maxX, y: minY } }, // top
    { p1: { x: maxX, y: minY }, p2: { x: maxX, y: maxY } }, // right
    { p1: { x: maxX, y: maxY }, p2: { x: minX, y: maxY } }, // bottom
    { p1: { x: minX, y: maxY }, p2: { x: minX, y: minY } }, // left
  ];
  
  for (const edge of edges) {
    if (linesIntersect(p1, p2, edge.p1, edge.p2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if two line segments intersect.
 * Handles parallel and co-linear cases.
 */
export function linesIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  
  if (Math.abs(denom) < 0.0001) {
    // Lines are parallel or co-linear - check if they overlap
    const dist1 = Math.abs((p2.y - p1.y) * p3.x - (p2.x - p1.x) * p3.y + p2.x * p1.y - p2.y * p1.x) / 
                  Math.sqrt((p2.y - p1.y) ** 2 + (p2.x - p1.x) ** 2);
    const dist2 = Math.abs((p2.y - p1.y) * p4.x - (p2.x - p1.x) * p4.y + p2.x * p1.y - p2.y * p1.x) / 
                  Math.sqrt((p2.y - p1.y) ** 2 + (p2.x - p1.x) ** 2);
    
    if (dist1 < 0.001 && dist2 < 0.001) {
      // Lines are co-linear, check if segments overlap
      const min1X = Math.min(p1.x, p2.x);
      const max1X = Math.max(p1.x, p2.x);
      const min2X = Math.min(p3.x, p4.x);
      const max2X = Math.max(p3.x, p4.x);
      const min1Y = Math.min(p1.y, p2.y);
      const max1Y = Math.max(p1.y, p2.y);
      const min2Y = Math.min(p3.y, p4.y);
      const max2Y = Math.max(p3.y, p4.y);
      
      return !(max1X < min2X || max2X < min1X || max1Y < min2Y || max2Y < min1Y);
    }
    
    return false; // Parallel but not co-linear
  }
  
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  
  // Use small tolerance for edge cases
  const TOLERANCE = 0.0001;
  return ua >= -TOLERANCE && ua <= 1 + TOLERANCE && ub >= -TOLERANCE && ub <= 1 + TOLERANCE;
}

/**
 * Calculate bounding box for a set of points.
 */
export function getBoundingBox(points: Point[]): Rect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Check if two rectangles intersect.
 */
export function rectsIntersect(r1: Rect, r2: Rect): boolean {
  return !(r1.x + r1.width < r2.x || 
           r2.x + r2.width < r1.x ||
           r1.y + r1.height < r2.y || 
           r2.y + r2.height < r1.y);
}

/**
 * Calculate distance between two points.
 */
export function pointDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a point is near another point within a threshold distance.
 */
export function isPointNear(
  point: Point,
  target: Point,
  threshold: number
): boolean {
  return pointDistance(point, target) <= threshold;
}
