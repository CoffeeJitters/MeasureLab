export type MeasurementType = 'length' | 'area' | 'count';

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

