import { Measurement, MeasurementType, Unit, ScaleCalibration } from '@/types';
import { getCategoryColor, getDefaultColor } from './categories';

export const calculateLength = (points: { x: number; y: number }[], calibration: ScaleCalibration | null): number => {
  if (points.length < 2) return 0;
  
  let totalPixels = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalPixels += Math.sqrt(dx * dx + dy * dy);
  }

  if (!calibration || !calibration.isCalibrated) {
    return totalPixels; // Return pixels if not calibrated
  }

  const scale = calibration.realDistance / calibration.pixelDistance;
  const realDistance = totalPixels * scale;
  return convertUnits(realDistance, calibration.units, 'ft');
};

export const calculateArea = (points: { x: number; y: number }[], calibration: ScaleCalibration | null): number => {
  if (points.length < 3) return 0;

  // Shoelace formula for polygon area
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  area = Math.abs(area) / 2;

  if (!calibration || !calibration.isCalibrated) {
    return area; // Return pixel² if not calibrated
  }

  const scale = calibration.realDistance / calibration.pixelDistance;
  const realArea = area * scale * scale;
  return convertUnits(realArea, squareUnit(calibration.units), 'ft²');
};

export const convertUnits = (value: number, fromUnit: Unit | string, toUnit: Unit | string): number => {
  // Convert to base unit (feet or square feet) first
  const toBase: Record<string, number> = {
    'ft': 1,
    'in': 1 / 12,
    'm': 3.28084,
    'cm': 0.0328084,
    'mm': 0.00328084,
    'ft²': 1,
    'in²': 1 / 144,
    'm²': 10.7639,
    'cm²': 0.00107639,
    'mm²': 0.0000107639,
  };

  const fromBase: Record<string, number> = {
    'ft': 1,
    'in': 12,
    'm': 0.3048,
    'cm': 30.48,
    'mm': 304.8,
    'ft²': 1,
    'in²': 144,
    'm²': 0.092903,
    'cm²': 929.03,
    'mm²': 92903,
  };

  const baseValue = value * (toBase[fromUnit] || 1);
  return baseValue * (fromBase[toUnit] || 1);
};

const squareUnit = (unit: Unit): string => {
  return unit + '²';
};

export const formatMeasurementValue = (value: number, units: Unit, type: MeasurementType): string => {
  if (type === 'area') {
    return `${value.toFixed(2)} ${units}²`;
  } else if (type === 'count') {
    return `${value}`;
  } else {
    return `${value.toFixed(2)} ${units}`;
  }
};

/**
 * Generate color for a measurement based on category or default color
 * @param category - Optional category name
 * @returns Color hex string
 */
export const generateColor = (category?: string): string => {
  return getCategoryColor(category);
};

export const exportToCSV = (measurements: Measurement[]): void => {
  const headers = ['Name', 'Type', 'Value', 'Units', 'Category', 'Notes'];
  const rows = measurements.map(m => [
    m.name,
    m.type,
    m.value.toString(),
    m.units,
    m.category || '',
    m.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `measurements-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

