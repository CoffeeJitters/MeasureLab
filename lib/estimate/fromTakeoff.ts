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
import { EstimateSettings, defaultEstimateSettings } from './config';

/**
 * Map takeoff measurements to estimate inputs
 * 
 * Rules:
 * 1) Surface measurements (area type) → Always contribute to ceilingSF
 * 2) Linear measurements (length type) → Convert LF to wallSF using wall height
 * 3) Count measurements → Openings if marked as door/window
 * 
 * @param measurements - Array of measurements from takeoff
 * @param settings - Estimate settings (defaultWallHeightFt, etc.)
 * @returns EstimateInputs ready for calculation
 */
export function mapTakeoffToEstimateInputs(
  measurements: Measurement[],
  settings: EstimateSettings = defaultEstimateSettings
): EstimateInputs {
  let wallAreaSF = 0;
  let ceilingAreaSF = 0;
  let wallLinearFt = 0;
  let ceilingPerimeterFt = 0;
  const openings: Opening[] = [];

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
    if (measurement.type === 'area') {
      // Rule 1: Surface measurements → Always ceilingSF
      // (unless it's an opening)
      if (isOpening(measurement)) {
        // This is an opening - try to extract dimensions
        const areaSF = measurement.value; // Already in square feet
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
      } else {
        // Surface measurement = ceiling only
        ceilingAreaSF += measurement.value;
      }
    } else if (measurement.type === 'length') {
      // Rule 2: Linear measurements → Convert LF to wallSF
      const linearLF = measurement.value; // Already in linear feet
      
      // Use overrideHeight if available, otherwise use default from settings
      const wallHeightFt = measurement.overrideHeight ?? settings.defaultWallHeightFt;
      
      // Convert LF to wallSF: wallSF = LF * wallHeight
      const wallSF = linearLF * wallHeightFt;
      wallAreaSF += wallSF;
      
      // Also track linear feet for corner bead calculations
      wallLinearFt += linearLF;
    } else if (measurement.type === 'count') {
      // Rule 3: Count measurements → Openings if marked as door/window
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
    }
  }

  // Build notes about assumptions made
  const notes: string[] = [];
  if (wallAreaSF === 0 && ceilingAreaSF === 0) {
    notes.push('No measurements found. Add Surface measurements for ceilings and Linear measurements for walls.');
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

