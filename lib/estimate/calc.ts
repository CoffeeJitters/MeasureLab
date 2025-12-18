/**
 * Estimate Calculations
 * 
 * Pure functions for calculating drywall estimate quantities, labor, and pricing.
 */

import {
  EstimateInputs,
  EstimateResult,
  MaterialQuantities,
  LaborHours,
  Pricing,
  EstimateLineItem,
} from './types';
import { EstimateConfig, defaultEstimateConfig } from './config';

/**
 * Calculate material quantities needed for the estimate
 */
export function calculateMaterials(
  inputs: EstimateInputs,
  config: EstimateConfig = defaultEstimateConfig
): MaterialQuantities {
  const areas = calculateAreas(inputs);
  const totalSF = areas.totalSF;

  // Drywall sheets (round up)
  const sheets = Math.ceil(totalSF / config.materials.sheetSizeSF);

  // Screws (1 per SF, rounded up to nearest 1000)
  const screws = Math.ceil(totalSF * config.materials.screwsPerSF / 1000) * 1000;

  // Joint tape (estimate based on linear feet of joints)
  // Rough estimate: assume ~10% of total SF is joints (seams)
  const estimatedJointLF = totalSF * 0.1;
  const tapeRolls = Math.ceil(estimatedJointLF / config.materials.tapeLFPerRoll);

  // Joint compound (gallons)
  const jointCompoundGallons = Math.ceil(totalSF / config.materials.compoundSFPerGallon);

  // Corner bead (optional - estimate based on wall linear feet)
  // Assume ~1 corner bead per 8 LF of wall perimeter
  const cornerBeadLF = Math.ceil(inputs.wallLinearFt / config.materials.cornerBeadLFPerCorner) * 
                        config.materials.cornerBeadLFPerCorner;

  return {
    sheets,
    screws,
    tapeRolls,
    jointCompoundGallons,
    cornerBeadLF,
  };
}

/**
 * Calculate labor hours required
 */
export function calculateLabor(
  inputs: EstimateInputs,
  finishLevel: 1 | 2 | 3 | 4 | 5 = 3,
  config: EstimateConfig = defaultEstimateConfig
): LaborHours {
  const areas = calculateAreas(inputs);
  const totalSF = areas.totalSF;

  // Hanging hours
  const hanging = totalSF * config.labor.hangingHoursPerSF;

  // Finishing hours (by level)
  const finishingHoursPerSF = config.labor.finishingHoursPerSF[`level${finishLevel}` as keyof typeof config.labor.finishingHoursPerSF];
  const finishing = {
    level1: totalSF * config.labor.finishingHoursPerSF.level1,
    level2: totalSF * config.labor.finishingHoursPerSF.level2,
    level3: totalSF * config.labor.finishingHoursPerSF.level3,
    level4: totalSF * config.labor.finishingHoursPerSF.level4,
    level5: totalSF * config.labor.finishingHoursPerSF.level5,
  };

  // Cleanup hours (fixed)
  const cleanup = config.labor.cleanupHours;

  // Total hours (hanging + finishing for selected level + cleanup)
  const total = hanging + finishingHoursPerSF + cleanup;

  return {
    hanging,
    finishing,
    cleanup,
    total,
  };
}

/**
 * Calculate pricing breakdown
 */
export function calculatePricing(
  inputs: EstimateInputs,
  materials: MaterialQuantities,
  labor: LaborHours,
  finishLevel: 1 | 2 | 3 | 4 | 5 = 3,
  config: EstimateConfig = defaultEstimateConfig
): Pricing {
  // Material costs
  const sheetCost = materials.sheets * config.pricing.sheetPrice;
  const screwsCost = (materials.screws / 1000) * config.pricing.screwsPer1000Price;
  const tapeCost = materials.tapeRolls * config.pricing.tapeRollPrice;
  const compoundCost = materials.jointCompoundGallons * config.pricing.compoundGallonPrice;
  const cornerBeadCost = (materials.cornerBeadLF || 0) * config.pricing.cornerBeadLFPrice;
  
  const materialsCost = sheetCost + screwsCost + tapeCost + compoundCost + cornerBeadCost;

  // Labor cost
  const laborCost = labor.total * config.pricing.laborRatePerHour;

  // Subtotal
  const subtotal = materialsCost + laborCost;

  // Overhead
  const overheadPercent = config.pricing.overheadPercent;
  const overhead = subtotal * overheadPercent;

  // Profit (on subtotal + overhead)
  const profitPercent = config.pricing.profitPercent;
  const profit = (subtotal + overhead) * profitPercent;

  // Tax (on subtotal + overhead + profit)
  const taxPercent = config.pricing.taxPercent;
  const tax = (subtotal + overhead + profit) * taxPercent;

  // Total
  const total = subtotal + overhead + profit + tax;

  return {
    materialsCost,
    laborCost,
    subtotal,
    overheadPercent,
    overhead,
    profitPercent,
    profit,
    taxPercent,
    tax,
    total,
  };
}

/**
 * Calculate net areas after subtracting openings
 */
export function calculateAreas(inputs: EstimateInputs): {
  netWallSF: number;
  netCeilingSF: number;
  totalSF: number;
} {
  // Sum opening areas
  const totalOpeningSF = inputs.openings.reduce((sum, opening) => sum + opening.areaSF, 0);

  // Net wall area (subtract openings from wall area)
  const netWallSF = Math.max(0, inputs.wallAreaSF - totalOpeningSF);

  // Net ceiling area (no openings subtracted typically)
  const netCeilingSF = inputs.ceilingAreaSF;

  // Total area
  const totalSF = netWallSF + netCeilingSF;

  return {
    netWallSF,
    netCeilingSF,
    totalSF,
  };
}

/**
 * Generate line items for the estimate
 */
export function generateLineItems(
  inputs: EstimateInputs,
  materials: MaterialQuantities,
  labor: LaborHours,
  pricing: Pricing,
  finishLevel: 1 | 2 | 3 | 4 | 5 = 3,
  config: EstimateConfig = defaultEstimateConfig
): EstimateLineItem[] {
  const items: EstimateLineItem[] = [];

  // Material line items
  items.push({
    description: 'Drywall Sheets (4x8)',
    quantity: materials.sheets,
    unit: 'sheets',
    unitPrice: config.pricing.sheetPrice,
    total: materials.sheets * config.pricing.sheetPrice,
    category: 'materials',
  });

  items.push({
    description: 'Drywall Screws',
    quantity: materials.screws,
    unit: 'screws',
    unitPrice: config.pricing.screwsPer1000Price / 1000,
    total: (materials.screws / 1000) * config.pricing.screwsPer1000Price,
    category: 'materials',
  });

  items.push({
    description: 'Joint Tape',
    quantity: materials.tapeRolls,
    unit: 'rolls',
    unitPrice: config.pricing.tapeRollPrice,
    total: materials.tapeRolls * config.pricing.tapeRollPrice,
    category: 'materials',
  });

  items.push({
    description: 'Joint Compound',
    quantity: materials.jointCompoundGallons,
    unit: 'gallons',
    unitPrice: config.pricing.compoundGallonPrice,
    total: materials.jointCompoundGallons * config.pricing.compoundGallonPrice,
    category: 'materials',
  });

  if (materials.cornerBeadLF && materials.cornerBeadLF > 0) {
    items.push({
      description: 'Corner Bead',
      quantity: materials.cornerBeadLF,
      unit: 'LF',
      unitPrice: config.pricing.cornerBeadLFPrice,
      total: materials.cornerBeadLF * config.pricing.cornerBeadLFPrice,
      category: 'materials',
    });
  }

  // Labor line items
  const finishingHours = labor.finishing[`level${finishLevel}` as keyof typeof labor.finishing] as number;
  
  items.push({
    description: 'Hanging Drywall',
    quantity: labor.hanging,
    unit: 'hours',
    unitPrice: config.pricing.laborRatePerHour,
    total: labor.hanging * config.pricing.laborRatePerHour,
    category: 'labor',
  });

  items.push({
    description: `Finishing (Level ${finishLevel})`,
    quantity: finishingHours,
    unit: 'hours',
    unitPrice: config.pricing.laborRatePerHour,
    total: finishingHours * config.pricing.laborRatePerHour,
    category: 'labor',
  });

  items.push({
    description: 'Cleanup',
    quantity: labor.cleanup,
    unit: 'hours',
    unitPrice: config.pricing.laborRatePerHour,
    total: labor.cleanup * config.pricing.laborRatePerHour,
    category: 'labor',
  });

  // Overhead
  items.push({
    description: `Overhead (${(pricing.overheadPercent * 100).toFixed(1)}%)`,
    quantity: 1,
    unit: '',
    unitPrice: pricing.overhead,
    total: pricing.overhead,
    category: 'overhead',
  });

  // Profit
  items.push({
    description: `Profit (${(pricing.profitPercent * 100).toFixed(1)}%)`,
    quantity: 1,
    unit: '',
    unitPrice: pricing.profit,
    total: pricing.profit,
    category: 'profit',
  });

  // Tax
  items.push({
    description: `Tax (${(pricing.taxPercent * 100).toFixed(1)}%)`,
    quantity: 1,
    unit: '',
    unitPrice: pricing.tax,
    total: pricing.tax,
    category: 'tax',
  });

  return items;
}

/**
 * Calculate complete estimate from inputs
 */
export function calculateEstimate(
  inputs: EstimateInputs,
  finishLevel: 1 | 2 | 3 | 4 | 5 = 3,
  config: EstimateConfig = defaultEstimateConfig
): EstimateResult {
  const areas = calculateAreas(inputs);
  const materials = calculateMaterials(inputs, config);
  const labor = calculateLabor(inputs, finishLevel, config);
  const pricing = calculatePricing(inputs, materials, labor, finishLevel, config);
  const lineItems = generateLineItems(inputs, materials, labor, pricing, finishLevel, config);

  return {
    inputs,
    areas,
    materials,
    labor,
    pricing,
    lineItems,
    finishLevel,
  };
}
