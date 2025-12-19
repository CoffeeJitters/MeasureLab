/**
 * Estimate Configuration
 * 
 * Placeholder assumptions with comments explaining typical values.
 * These should be customized per project/region.
 */

/**
 * Estimate settings interface (user-configurable)
 */
export interface EstimateSettings {
  defaultWallHeightFt: number;
  drywallSheetSize: '4x8' | '4x10' | '4x12';
  wastePercent: number;
}

/**
 * Estimate configuration interface
 */
export interface EstimateConfig {
  materials: {
    sheetSizeSF: number;
    screwsPerSF: number;
    tapeLFPerRoll: number;
    compoundSFPerGallon: number;
    cornerBeadLFPerCorner: number;
  };
  labor: {
    hangingHoursPerSF: number;
    finishingHoursPerSF: {
      level1: number;
      level2: number;
      level3: number;
      level4: number;
      level5: number;
    };
    cleanupHours: number;
  };
  pricing: {
    sheetPrice: number;
    screwsPer1000Price: number;
    tapeRollPrice: number;
    compoundGallonPrice: number;
    cornerBeadLFPrice: number;
    laborRatePerHour: number;
    overheadPercent: number;
    profitPercent: number;
    taxPercent: number;
  };
  defaultFinishLevel: 1 | 2 | 3 | 4 | 5;
}

/**
 * Default estimate settings
 */
export const defaultEstimateSettings: EstimateSettings = {
  defaultWallHeightFt: 8, // 8 feet default wall height
  drywallSheetSize: '4x8', // 4x8 = 32 SF
  wastePercent: 10, // 10% waste factor
};

/**
 * Get sheet area in SF based on sheet size
 */
export function getSheetAreaSF(sheetSize: '4x8' | '4x10' | '4x12'): number {
  switch (sheetSize) {
    case '4x8':
      return 32;
    case '4x10':
      return 40;
    case '4x12':
      return 48;
    default:
      return 32;
  }
}

/**
 * Default configuration for drywall estimates
 * 
 * TODO: Make these configurable via UI or project settings
 */
export const defaultEstimateConfig: EstimateConfig = {
  // Material specifications
  materials: {
    // Standard drywall sheet size (4x8 feet = 32 SF)
    sheetSizeSF: 32,
    // Screws per square foot for hanging
    screwsPerSF: 1,
    // Linear feet per roll of joint tape
    tapeLFPerRoll: 500,
    // Square feet per gallon of joint compound
    compoundSFPerGallon: 100,
    // Corner bead (optional) - linear feet per room corner
    cornerBeadLFPerCorner: 8, // Approximate
  },

  // Labor rates (hours per unit)
  labor: {
    // Hours per SF for hanging drywall
    hangingHoursPerSF: 0.05, // ~3 minutes per SF
    // Hours per SF for finishing by level
    finishingHoursPerSF: {
      level1: 0.02, // Basic taping (~1.2 min/SF)
      level2: 0.04, // Additional coats (~2.4 min/SF)
      level3: 0.08, // Full finish (~4.8 min/SF)
      level4: 0.12, // Primer ready (~7.2 min/SF)
      level5: 0.16, // High gloss ready (~9.6 min/SF)
    },
    // Hours for cleanup (fixed per project)
    cleanupHours: 2,
  },

  // Pricing (unit costs)
  pricing: {
    // Cost per drywall sheet
    sheetPrice: 12.00,
    // Cost per 1000 screws
    screwsPer1000Price: 15.00,
    // Cost per roll of tape
    tapeRollPrice: 8.00,
    // Cost per gallon of joint compound
    compoundGallonPrice: 25.00,
    // Cost per linear foot of corner bead
    cornerBeadLFPrice: 1.50,
    // Labor rate per hour
    laborRatePerHour: 45.00,
    // Overhead percentage (as decimal, e.g., 0.15 = 15%)
    overheadPercent: 0.15,
    // Profit percentage (as decimal)
    profitPercent: 0.20,
    // Tax percentage (as decimal)
    taxPercent: 0.08, // 8% sales tax (varies by location)
  },

  // Default finish level (1-5)
  defaultFinishLevel: 3, // Standard Level 3 finish
};
