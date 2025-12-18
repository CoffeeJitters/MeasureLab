/**
 * Example: Estimate Calculation
 * 
 * Demonstrates how to use the estimate module with sample data.
 */

import { Measurement } from '@/types';
import { mapTakeoffToEstimateInputs } from './fromTakeoff';
import { calculateEstimate } from './calc';

/**
 * Example: Calculate estimate from sample takeoff measurements
 */
export function exampleEstimate() {
  // Sample measurements that might come from takeoff
  const sampleMeasurements: Measurement[] = [
    // Wall areas
    {
      id: '1',
      name: 'Wall Area 1',
      type: 'area',
      value: 120,
      units: 'ft',
      color: '#3B82F6',
      category: 'Wall',
      data: { points: [] },
    },
    {
      id: '2',
      name: 'Wall Area 2',
      type: 'area',
      value: 150,
      units: 'ft',
      color: '#3B82F6',
      category: 'Wall',
      data: { points: [] },
    },
    // Ceiling area
    {
      id: '3',
      name: 'Ceiling Area',
      type: 'area',
      value: 200,
      units: 'ft',
      color: '#10B981',
      category: 'Ceiling',
      data: { points: [] },
    },
    // Wall linear feet
    {
      id: '4',
      name: 'Wall Perimeter',
      type: 'length',
      value: 50,
      units: 'ft',
      color: '#3B82F6',
      data: { points: [] },
    },
    // Openings
    {
      id: '5',
      name: 'Door 1',
      type: 'area',
      value: 21, // 3x7 door
      units: 'ft',
      color: '#F59E0B',
      category: 'Door',
      data: { points: [] },
    },
    {
      id: '6',
      name: 'Window 1',
      type: 'count',
      value: 2, // 2 windows
      units: 'ft',
      color: '#EC4899',
      category: 'Window',
      data: { point: { x: 0, y: 0 } },
    },
  ];

  // Step 1: Map takeoff measurements to estimate inputs
  const inputs = mapTakeoffToEstimateInputs(sampleMeasurements);

  console.log('Estimate Inputs:', {
    wallAreaSF: inputs.wallAreaSF,
    ceilingAreaSF: inputs.ceilingAreaSF,
    wallLinearFt: inputs.wallLinearFt,
    ceilingPerimeterFt: inputs.ceilingPerimeterFt,
    openings: inputs.openings.length,
  });

  // Step 2: Calculate estimate
  const estimate = calculateEstimate(inputs, 3); // Level 3 finish

  console.log('Estimate Result:', {
    totalSF: estimate.areas.totalSF,
    netWallSF: estimate.areas.netWallSF,
    netCeilingSF: estimate.areas.netCeilingSF,
    materials: {
      sheets: estimate.materials.sheets,
      screws: estimate.materials.screws,
      tapeRolls: estimate.materials.tapeRolls,
      compoundGallons: estimate.materials.jointCompoundGallons,
    },
    labor: {
      totalHours: estimate.labor.total,
      hangingHours: estimate.labor.hanging,
      finishingHours: estimate.labor.finishing.level3,
    },
    pricing: {
      materialsCost: estimate.pricing.materialsCost,
      laborCost: estimate.pricing.laborCost,
      subtotal: estimate.pricing.subtotal,
      overhead: estimate.pricing.overhead,
      profit: estimate.pricing.profit,
      tax: estimate.pricing.tax,
      total: estimate.pricing.total,
    },
  });

  return estimate;
}

/**
 * Example output (for documentation):
 * 
 * Inputs:
 * - Wall Area: 270 SF
 * - Ceiling Area: 200 SF
 * - Wall Linear Feet: 50 LF
 * - Openings: 1 door (21 SF) + 2 windows (32 SF) = 53 SF
 * 
 * Calculations:
 * - Net Wall SF: 270 - 53 = 217 SF
 * - Net Ceiling SF: 200 SF
 * - Total SF: 417 SF
 * 
 * Materials:
 * - Sheets: ceil(417 / 32) = 14 sheets
 * - Screws: ~417 screws (rounded to 1000)
 * - Tape: ceil(41.7 / 500) = 1 roll
 * - Compound: ceil(417 / 100) = 5 gallons
 * 
 * Labor (Level 3):
 * - Hanging: 417 * 0.05 = 20.85 hours
 * - Finishing: 417 * 0.08 = 33.36 hours
 * - Cleanup: 2 hours
 * - Total: 56.21 hours
 * 
 * Pricing:
 * - Materials: ~$300
 * - Labor: 56.21 * $45 = $2,529
 * - Subtotal: $2,829
 * - Overhead (15%): $424
 * - Profit (20%): $651
 * - Tax (8%): $312
 * - Total: ~$4,216
 */
