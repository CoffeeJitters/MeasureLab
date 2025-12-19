export type MeasurementType = 'length' | 'area' | 'count';
export type ToolType = MeasurementType | 'calibrate' | 'select' | 'pan';
// Unified tool type that includes null for state management
export type Tool = ToolType | null;

export type Unit = 'ft' | 'in' | 'm' | 'cm' | 'mm';

export interface Category {
  name: string;
  color: string;
}

export interface Measurement {
  id: string;
  name: string;
  type: MeasurementType;
  value: number;
  units: Unit;
  color: string;
  category?: string;
  notes?: string;
  data: any; // Tool-specific data (points, polygon, etc.)
  pageNumber?: number;
  groupId?: string | null; // Group identifier - null or undefined means ungrouped
  overrideHeight?: number; // Optional wall height override for Linear measurements (in feet)
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  file: File;
  url?: string;
  pageCount?: number;
}

export interface ScaleCalibration {
  pixelDistance: number;
  realDistance: number;
  units: Unit;
  isCalibrated: boolean;
}

export interface Group {
  id: string;
  name: string;
  createdAt: number;
}

