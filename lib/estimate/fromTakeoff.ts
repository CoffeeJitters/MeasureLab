/**
 * Adapter: Map Takeoff Measurements to Estimate Inputs
 * 
 * This function reads from the existing takeoff system and converts
 * measurements into normalized inputs for the estimator.
 * 
 * IMPORTANT: This is a READ-ONLY adapter. It does not modify takeoff data.
 */

import { Measurement } from '@/types';
import { EstimateInputs, Opening } from './types';

/**
 * Map takeoff measurements to estimate inputs
 * 
 * This function analyzes the measurements array and derives:
 * - Wall area SF (from area measurements categorized/named as walls)
 * - Ceiling area SF (from area measurements categorized/named as ceilings)
 * - Wall linear feet (from length measurements for walls)
 * - Ceiling perimeter feet (from length measurements for ceiling perimeter)
 * - Openings (from count measurements or area measurements marked as doors/windows)
 * 
 * @param measurements - Array of measurements from takeoff
 * @returns EstimateInputs ready for calculation
 */
export function mapTakeoffToEstimateInputs(measurements: Measurement[]): EstimateInputs {
  let wallAreaSF = 0;
  let ceilingAreaSF = 0;
  let wallLinearFt = 0;
  let ceilingPerimeterFt = 0;
  const openings: Opening[] = [];

  // Helper to check if a measurement is categorized/named as a wall
  const isWall = (m: Measurement): boolean => {
    const categoryLower = (m.category || '').toLowerCase();
    const nameLower = m.name.toLowerCase();
    return (
      categoryLower.includes('wall') ||
      nameLower.includes('wall') ||
      // If no clear indicator, assume area measurements without ceiling indicators are walls
      (m.type === 'area' && !isCeiling(m) && !isOpening(m))
    );
  };

  // Helper to check if a measurement is categorized/named as a ceiling
  const isCeiling = (m: Measurement): boolean => {
    const categoryLower = (m.category || '').toLowerCase();
    const nameLower = m.name.toLowerCase();
    return (
      categoryLower.includes('ceiling') ||
      nameLower.includes('ceiling') ||
      nameLower.includes('ceiling')
    );
  };

  // Helper to check if a measurement represents an opening
  const isOpening = (m: Measurement): boolean => {
    const categoryLower = (m.category || '').toLowerCase();
    const nameLower = m.name.toLowerCase();
    return (
      categoryLower.includes('door') ||
      categoryLower.includes('window') ||
      categoryLower.includes('opening') ||
      nameLower.includes('door') ||
      nameLower.includes('window') ||
      nameLower.includes('opening')
    );
  };

  // Process each measurement
  for (const measurement of measurements) {
    // Note: calculateArea() and calculateLength() already convert to feet/ft²,
    // so the value is already in the correct units regardless of measurement.units field
    // The units field just indicates what unit was used for calibration
    const valueInSF = measurement.type === 'area' 
      ? measurement.value  // Already in square feet
      : measurement.value;  // Already in linear feet (we'll use it as LF)

    if (measurement.type === 'area') {
      if (isOpening(measurement)) {
        // This is an opening - try to extract dimensions
        // If it's an area measurement, we need to estimate dimensions
        // TODO: If takeoff system adds width/height fields, use those
        // For now, assume standard door (3x7) or window (4x4) based on area
        const areaSF = valueInSF;
        let widthFt: number;
        let heightFt: number;
        let type: 'door' | 'window' | 'other' = 'other';

        // Estimate dimensions based on area
        if (areaSF >= 18 && areaSF <= 24) {
          // Likely a standard door (3x7 = 21 SF)
          widthFt = 3;
          heightFt = 7;
          type = 'door';
        } else if (areaSF >= 12 && areaSF <= 20) {
          // Likely a window (4x4 = 16 SF or similar)
          widthFt = 4;
          heightFt = areaSF / 4;
          type = 'window';
        } else {
          // Estimate as square-ish opening
          widthFt = Math.sqrt(areaSF);
          heightFt = Math.sqrt(areaSF);
        }

        openings.push({
          type,
          widthFt,
          heightFt,
          areaSF,
          description: measurement.name,
        });
      } else if (isCeiling(measurement)) {
        ceilingAreaSF += valueInSF;
      } else if (isWall(measurement)) {
        wallAreaSF += valueInSF;
      } else {
        // Unclassified area measurement - default to wall
        // TODO: Could prompt user or use a default assumption
        wallAreaSF += valueInSF;
      }
    } else if (measurement.type === 'length') {
      const valueInLF = measurement.value; // Already in linear feet
      if (isCeiling(measurement) || measurement.name.toLowerCase().includes('perimeter')) {
        ceilingPerimeterFt += valueInLF;
      } else if (isWall(measurement)) {
        wallLinearFt += valueInLF;
      } else {
        // Unclassified length measurement - default to wall
        wallLinearFt += valueInLF;
      }
    } else if (measurement.type === 'count') {
      // Count measurements might represent openings
      // If categorized/named as door/window, create opening entries
      if (isOpening(measurement)) {
        const count = measurement.value || 1;
        // Default dimensions for counted openings
        const isDoor = (measurement.category || measurement.name).toLowerCase().includes('door');
        const widthFt = isDoor ? 3 : 4; // Standard door 3ft, window 4ft
        const heightFt = isDoor ? 7 : 4; // Standard door 7ft, window 4ft
        const areaSF = widthFt * heightFt;

        for (let i = 0; i < count; i++) {
          openings.push({
            type: isDoor ? 'door' : 'window',
            widthFt,
            heightFt,
            areaSF,
            description: `${measurement.name} ${i + 1}`,
          });
        }
      }
      // Otherwise, count measurements are not used in estimate
      // TODO: If takeoff system adds specific count types (e.g., "outlets", "switches"),
      //       those could be used for additional pricing
    }
  }

  // Build notes about assumptions made
  const notes: string[] = [];
  if (wallAreaSF === 0 && ceilingAreaSF === 0) {
    notes.push('No area measurements found. Please add wall and ceiling area measurements.');
  }
  
  // Check for count measurements
  const countMeasurements = measurements.filter(m => m.type === 'count');
  const countMeasurementsMarkedAsOpenings = countMeasurements.filter(m => {
    const categoryLower = (m.category || '').toLowerCase();
    const nameLower = m.name.toLowerCase();
    return categoryLower.includes('door') || categoryLower.includes('window') || 
           categoryLower.includes('opening') || nameLower.includes('door') || 
           nameLower.includes('window') || nameLower.includes('opening');
  });
  
  if (openings.length === 0) {
    if (countMeasurements.length > 0) {
      if (countMeasurementsMarkedAsOpenings.length === 0) {
        notes.push(`${countMeasurements.length} count measurement(s) found. Edit the name/category to include "door" or "window" to add them as openings.`);
      } else {
        // This shouldn't happen if openings.length === 0, but just in case
        notes.push(`${countMeasurementsMarkedAsOpenings.length} count measurement(s) marked as openings found.`);
      }
    } else {
      notes.push('No openings detected. Use the Count tool to mark doors/windows - they will be automatically categorized.');
    }
  } else {
    // Openings were detected, but mention if there are unmarked count measurements
    const unmarkedCounts = countMeasurements.length - countMeasurementsMarkedAsOpenings.length;
    if (unmarkedCounts > 0) {
      notes.push(`${unmarkedCounts} count measurement(s) not marked as openings. Edit name/category to include "door" or "window" to add them.`);
    }
  }

  return {
    wallAreaSF,
    ceilingAreaSF,
    wallLinearFt,
    ceilingPerimeterFt,
    openings,
    notes: notes.length > 0 ? notes.join(' ') : undefined,
  };
}

