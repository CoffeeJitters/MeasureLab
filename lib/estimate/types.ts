/**
 * Estimate Types
 * 
 * Defines the data structures for drywall estimating calculations.
 */

/**
 * Inputs required for drywall estimate calculation
 */
export interface EstimateInputs {
  /** Total wall area in square feet */
  wallAreaSF: number;
  /** Total ceiling area in square feet */
  ceilingAreaSF: number;
  /** Total wall linear feet (for corner bead, trim, etc.) */
  wallLinearFt: number;
  /** Ceiling perimeter in linear feet */
  ceilingPerimeterFt: number;
  /** List of openings (doors, windows) to subtract from wall area */
  openings: Opening[];
  /** Additional notes or assumptions */
  notes?: string;
}

/**
 * Represents an opening (door or window) that reduces wall area
 */
export interface Opening {
  /** Type of opening */
  type: 'door' | 'window' | 'other';
  /** Width in feet */
  widthFt: number;
  /** Height in feet */
  heightFt: number;
  /** Area in square feet (width * height) */
  areaSF: number;
  /** Description/notes */
  description?: string;
}

/**
 * Material quantities calculated for the estimate
 */
export interface MaterialQuantities {
  /** Number of drywall sheets (4x8 = 32 SF each, rounded up) */
  sheets: number;
  /** Number of screws (typically 1 per SF for hanging) */
  screws: number;
  /** Rolls of joint tape (typically 500 LF per roll) */
  tapeRolls: number;
  /** Gallons of joint compound (typically 1 gallon per 100 SF) */
  jointCompoundGallons: number;
  /** Linear feet of corner bead (optional) */
  cornerBeadLF?: number;
  /** Other materials as needed */
  other?: Record<string, number>;
}

/**
 * Labor hours by finish level
 */
export interface LaborHours {
  /** Hours for hanging drywall */
  hanging: number;
  /** Hours for finishing by level */
  finishing: {
    level1: number; // Basic taping
    level2: number; // Additional coats
    level3: number; // Full finish
    level4: number; // Primer ready
    level5: number; // High gloss ready
  };
  /** Hours for cleanup */
  cleanup: number;
  /** Total hours */
  total: number;
}

/**
 * Pricing breakdown
 */
export interface Pricing {
  /** Cost of materials */
  materialsCost: number;
  /** Cost of labor */
  laborCost: number;
  /** Subtotal (materials + labor) */
  subtotal: number;
  /** Overhead percentage */
  overheadPercent: number;
  /** Overhead amount */
  overhead: number;
  /** Profit percentage */
  profitPercent: number;
  /** Profit amount */
  profit: number;
  /** Tax percentage */
  taxPercent: number;
  /** Tax amount */
  tax: number;
  /** Total price */
  total: number;
}

/**
 * Individual line item in the estimate
 */
export interface EstimateLineItem {
  /** Item description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit (SF, LF, sheets, etc.) */
  unit: string;
  /** Unit price */
  unitPrice: number;
  /** Total price for this line item */
  total: number;
  /** Category (materials, labor, etc.) */
  category: 'materials' | 'labor' | 'overhead' | 'profit' | 'tax';
}

/**
 * Complete estimate result
 */
export interface EstimateResult {
  /** Input values used */
  inputs: EstimateInputs;
  /** Calculated areas (net after openings) */
  areas: {
    /** Net wall area in SF (after subtracting openings) */
    netWallSF: number;
    /** Net ceiling area in SF */
    netCeilingSF: number;
    /** Total area in SF */
    totalSF: number;
  };
  /** Material quantities */
  materials: MaterialQuantities;
  /** Labor hours */
  labor: LaborHours;
  /** Pricing breakdown */
  pricing: Pricing;
  /** Line items for display */
  lineItems: EstimateLineItem[];
  /** Finish level used for calculations */
  finishLevel: 1 | 2 | 3 | 4 | 5;
}
