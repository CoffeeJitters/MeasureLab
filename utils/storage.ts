import { Measurement, UploadedFile, ScaleCalibration } from '@/types';

const STORAGE_KEYS = {
  MEASUREMENTS: 'measurelab_measurements',
  FILES: 'measurelab_files',
  CALIBRATION: 'measurelab_calibration',
  ACTIVE_FILE: 'measurelab_active_file',
  ACTIVE_PAGE: 'measurelab_active_page',
  ACTIVE_TOOL: 'measurelab_active_tool',
};

export const storage = {
  saveMeasurements: (measurements: Measurement[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(measurements));
    } catch (error) {
      console.error('Failed to save measurements:', error);
    }
  },

  loadMeasurements: (): Measurement[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load measurements:', error);
      return [];
    }
  },

  saveFiles: (files: Omit<UploadedFile, 'file'>[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    } catch (error) {
      console.error('Failed to save files:', error);
    }
  },

  loadFiles: (): Omit<UploadedFile, 'file'>[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load files:', error);
      return [];
    }
  },

  saveCalibration: (calibration: ScaleCalibration) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(calibration));
    } catch (error) {
      console.error('Failed to save calibration:', error);
    }
  },

  loadCalibration: (): ScaleCalibration | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALIBRATION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load calibration:', error);
      return null;
    }
  },

  saveActiveFile: (fileId: string | null) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FILE, fileId || '');
    } catch (error) {
      console.error('Failed to save active file:', error);
    }
  },

  loadActiveFile: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE) || null;
    } catch (error) {
      console.error('Failed to load active file:', error);
      return null;
    }
  },

  saveActivePage: (pageNumber: number) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PAGE, pageNumber.toString());
    } catch (error) {
      console.error('Failed to save active page:', error);
    }
  },

  loadActivePage: (): number => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_PAGE);
      return data ? parseInt(data, 10) : 1;
    } catch (error) {
      console.error('Failed to load active page:', error);
      return 1;
    }
  },

  saveActiveTool: (tool: MeasurementType | 'calibrate' | null) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOOL, tool || '');
    } catch (error) {
      console.error('Failed to save active tool:', error);
    }
  },

  loadActiveTool: (): MeasurementType | 'calibrate' | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_TOOL) as MeasurementType | 'calibrate' | null;
    } catch (error) {
      console.error('Failed to load active tool:', error);
      return null;
    }
  },
};

