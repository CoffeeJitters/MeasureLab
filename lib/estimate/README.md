# Drywall Estimate Module

## Overview

This module adds **CALCULATIONS + PRICING** functionality to the drywall estimating app. It consumes takeoff measurements without modifying the existing takeoff functionality.

## Architecture

The module follows a clean separation:
- **Adapter Layer** (`fromTakeoff.ts`): Reads takeoff measurements (read-only)
- **Calculation Layer** (`calc.ts`): Pure functions for materials, labor, and pricing
- **Configuration** (`config.ts`): Configurable assumptions and rates
- **Types** (`types.ts`): TypeScript interfaces

## Calculation Specification

### Inputs → Formulas → Outputs

#### Step 1: Map Takeoff to Estimate Inputs
**Inputs from Takeoff:**
- Area measurements (SF) - categorized/named as "wall", "ceiling", "door", "window"
- Length measurements (LF) - categorized/named as "wall", "ceiling", "perimeter"
- Count measurements - categorized/named as "door", "window"

**Derived Inputs:**
```
wallAreaSF = sum(area measurements where category/name contains "wall")
ceilingAreaSF = sum(area measurements where category/name contains "ceiling")
wallLinearFt = sum(length measurements for walls)
ceilingPerimeterFt = sum(length measurements for ceiling perimeter)
openings[] = area/count measurements marked as doors/windows
```

#### Step 2: Calculate Net Areas
```
totalOpeningSF = sum(opening.areaSF for all openings)
netWallSF = max(0, wallAreaSF - totalOpeningSF)
netCeilingSF = ceilingAreaSF  // No openings subtracted
totalSF = netWallSF + netCeilingSF
```

#### Step 3: Calculate Materials
```
sheets = ceil(totalSF / 32)  // 4x8 sheets = 32 SF each
screws = ceil(totalSF * 1) rounded to nearest 1000  // 1 screw per SF
tapeRolls = ceil(estimatedJointLF / 500)  // ~10% of SF is joints
jointCompoundGallons = ceil(totalSF / 100)  // 1 gallon per 100 SF
cornerBeadLF = ceil(wallLinearFt / 8) * 8  // ~8 LF per corner
```

#### Step 4: Calculate Labor Hours
```
hangingHours = totalSF * 0.05  // ~3 minutes per SF
finishingHours = totalSF * finishingRate[level]  // Level 1-5 rates
cleanupHours = 2  // Fixed
totalHours = hangingHours + finishingHours + cleanupHours
```

**Finish Level Rates (hours per SF):**
- Level 1: 0.02 (~1.2 min/SF)
- Level 2: 0.04 (~2.4 min/SF)
- Level 3: 0.08 (~4.8 min/SF)
- Level 4: 0.12 (~7.2 min/SF)
- Level 5: 0.16 (~9.6 min/SF)

#### Step 5: Calculate Pricing
```
materialsCost = (sheets * $12) + (screws/1000 * $15) + (tapeRolls * $8) + 
                (compoundGallons * $25) + (cornerBeadLF * $1.50)
laborCost = totalHours * $45/hour
subtotal = materialsCost + laborCost
overhead = subtotal * 15%
profit = (subtotal + overhead) * 20%
tax = (subtotal + overhead + profit) * 8%
total = subtotal + overhead + profit + tax
```

## File Structure

```
lib/estimate/
├── types.ts          # TypeScript interfaces
├── config.ts         # Configuration with default rates/prices
├── calc.ts           # Pure calculation functions
├── fromTakeoff.ts    # Adapter: maps takeoff → estimate inputs
├── example.ts         # Usage example
└── README.md         # This file

components/
└── EstimatePanel.tsx  # UI component for displaying estimate

app/measure/
└── page.tsx          # Updated to include EstimatePanel toggle
```

## Example Calculation

### Input Scenario
- Wall Area: 270 SF
- Ceiling Area: 200 SF
- Wall Linear Feet: 50 LF
- Openings: 1 door (21 SF) + 2 windows (32 SF) = 53 SF total

### Calculations

**Net Areas:**
- Net Wall SF: 270 - 53 = **217 SF**
- Net Ceiling SF: **200 SF**
- Total SF: **417 SF**

**Materials:**
- Sheets: ceil(417 / 32) = **14 sheets**
- Screws: 417 * 1 = **417 screws** → rounded to **1,000 screws**
- Tape: ceil(41.7 / 500) = **1 roll**
- Compound: ceil(417 / 100) = **5 gallons**
- Corner Bead: ceil(50 / 8) * 8 = **56 LF**

**Labor (Level 3):**
- Hanging: 417 * 0.05 = **20.85 hours**
- Finishing: 417 * 0.08 = **33.36 hours**
- Cleanup: **2 hours**
- Total: **56.21 hours**

**Pricing:**
- Materials: (14 * $12) + (1 * $15) + (1 * $8) + (5 * $25) + (56 * $1.50) = **$300**
- Labor: 56.21 * $45 = **$2,529**
- Subtotal: **$2,829**
- Overhead (15%): **$424**
- Profit (20%): **$651**
- Tax (8%): **$312**
- **Total: $4,216**

## Usage

```typescript
import { mapTakeoffToEstimateInputs } from '@/lib/estimate/fromTakeoff';
import { calculateEstimate } from '@/lib/estimate/calc';

// Step 1: Convert takeoff measurements to estimate inputs
const inputs = mapTakeoffToEstimateInputs(measurements);

// Step 2: Calculate estimate (default Level 3 finish)
const estimate = calculateEstimate(inputs, 3);

// Access results
console.log(estimate.areas.totalSF);
console.log(estimate.pricing.total);
console.log(estimate.lineItems);
```

## Configuration

Default rates and prices are in `config.ts`. To customize:

```typescript
import { defaultEstimateConfig } from '@/lib/estimate/config';

const customConfig = {
  ...defaultEstimateConfig,
  pricing: {
    ...defaultEstimateConfig.pricing,
    laborRatePerHour: 50.00,  // Custom rate
  },
};

const estimate = calculateEstimate(inputs, 3, customConfig);
```

## Notes

- **No takeoff changes**: The adapter only reads from existing measurements
- **Category-based detection**: Uses measurement `category` and `name` fields to identify walls, ceilings, openings
- **Default assumptions**: Unclassified area measurements default to walls
- **Opening detection**: Looks for "door", "window", "opening" in category/name
- **Unit handling**: Values from `calculateArea()` and `calculateLength()` are already in feet/ft²

## TODO / Future Enhancements

- Add UI for configuring rates/prices
- Support custom finish levels per room
- Add width/height fields to openings for more accurate calculations
- Export estimate to PDF/CSV
- Support multiple estimate scenarios (Level 1-5 comparison)
