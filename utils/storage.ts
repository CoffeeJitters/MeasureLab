import { Measurement, UploadedFile, ScaleCalibration, Category, Group } from '@/types';
import { EstimateSettings } from '@/lib/estimate/config';

const STORAGE_KEYS = {
  MEASUREMENTS: 'measurelab_measurements',
  FILES: 'measurelab_files',
  CALIBRATION: 'measurelab_calibration',
  ACTIVE_FILE: 'measurelab_active_file',
  ACTIVE_PAGE: 'measurelab_active_page',
  ACTIVE_TOOL: 'measurelab_active_tool',
  CATEGORIES: 'measurelab_categories',
  GROUPS: 'measurelab_groups',
  ESTIMATE_SETTINGS: 'measurelab_estimate_settings',
};

// Check if localStorage is available (browser environment)
const isLocalStorageAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
};

export const storage = {
  saveMeasurements: (measurements: Measurement[]) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(measurements));
    } catch (error) {
      console.error('Failed to save measurements:', error);
    }
  },

  loadMeasurements: (): Measurement[] => {
    if (!isLocalStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load measurements:', error);
      return [];
    }
  },

  saveFiles: (files: Omit<UploadedFile, 'file'>[]) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    } catch (error) {
      console.error('Failed to save files:', error);
    }
  },

  loadFiles: (): Omit<UploadedFile, 'file'>[] => {
    if (!isLocalStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load files:', error);
      return [];
    }
  },

  saveCalibration: (calibration: ScaleCalibration) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(calibration));
    } catch (error) {
      console.error('Failed to save calibration:', error);
    }
  },

  loadCalibration: (): ScaleCalibration | null => {
    if (!isLocalStorageAvailable()) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALIBRATION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load calibration:', error);
      return null;
    }
  },

  saveActiveFile: (fileId: string | null) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FILE, fileId || '');
    } catch (error) {
      console.error('Failed to save active file:', error);
    }
  },

  loadActiveFile: (): string | null => {
    if (!isLocalStorageAvailable()) return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE) || null;
    } catch (error) {
      console.error('Failed to load active file:', error);
      return null;
    }
  },

  saveActivePage: (pageNumber: number) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PAGE, pageNumber.toString());
    } catch (error) {
      console.error('Failed to save active page:', error);
    }
  },

  loadActivePage: (): number => {
    if (!isLocalStorageAvailable()) return 1;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_PAGE);
      return data ? parseInt(data, 10) : 1;
    } catch (error) {
      console.error('Failed to load active page:', error);
      return 1;
    }
  },

  saveActiveTool: (tool: MeasurementType | 'calibrate' | null) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOOL, tool || '');
    } catch (error) {
      console.error('Failed to save active tool:', error);
    }
  },

  loadActiveTool: (): MeasurementType | 'calibrate' | null => {
    if (!isLocalStorageAvailable()) return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_TOOL) as MeasurementType | 'calibrate' | null;
    } catch (error) {
      console.error('Failed to load active tool:', error);
      return null;
    }
  },

  saveCategories: (categories: Category[]) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (error) {
      console.error('Failed to save categories:', error);
    }
  },

  loadCategories: (): Category[] => {
    if (!isLocalStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load categories:', error);
      return [];
    }
  },

  saveGroups: (groups: Group[]) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    } catch (error) {
      console.error('Failed to save groups:', error);
    }
  },

  loadGroups: (): Group[] => {
    if (!isLocalStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load groups:', error);
      return [];
    }
  },

  saveEstimateSettings: (settings: EstimateSettings) => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ESTIMATE_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save estimate settings:', error);
    }
  },

  loadEstimateSettings: (): EstimateSettings | null => {
    if (!isLocalStorageAvailable()) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ESTIMATE_SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load estimate settings:', error);
      return null;
    }
  },
};

