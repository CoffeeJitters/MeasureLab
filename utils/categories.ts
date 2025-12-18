import { Category } from '@/types';
import { storage } from './storage';

// Predefined categories with their colors
const PREDEFINED_CATEGORIES: Category[] = [
  { name: 'Garage', color: '#F59E0B' }, // Orange
  { name: 'Double Drywall', color: '#8B5CF6' }, // Purple
  { name: 'Kitchen', color: '#10B981' }, // Green
  { name: 'Bathroom', color: '#06B6D4' }, // Cyan
  { name: 'Bedroom', color: '#EC4899' }, // Pink
];

// Default color for measurements without a category
const DEFAULT_COLOR = '#3B82F6'; // Blue

// Tool-specific colors for measurements
export const TOOL_COLORS: Record<MeasurementType, string> = {
  length: '#06B6D4',  // Cyan - for linear measurements
  area: '#10B981',    // Green - for area measurements
  count: '#F59E0B',   // Amber/Orange - for counting items
};

/**
 * Get the default color for measurements without a category
 */
export const getDefaultColor = (): string => {
  return DEFAULT_COLOR;
};

/**
 * Get the color for a specific measurement type
 */
export const getToolColor = (type: MeasurementType): string => {
  return TOOL_COLORS[type] || DEFAULT_COLOR;
};

/**
 * Get all categories (predefined + custom)
 */
export const getAllCategories = (): Category[] => {
  const customCategories = storage.loadCategories();
  return [...PREDEFINED_CATEGORIES, ...customCategories];
};

/**
 * Get the color for a specific category, or default color if category is undefined
 */
export const getCategoryColor = (category: string | undefined): string => {
  if (!category) {
    return getDefaultColor();
  }

  // Check predefined categories first
  const predefined = PREDEFINED_CATEGORIES.find(c => c.name === category);
  if (predefined) {
    return predefined.color;
  }

  // Check custom categories
  const customCategories = storage.loadCategories();
  const custom = customCategories.find(c => c.name === category);
  if (custom) {
    return custom.color;
  }

  // If category not found, return default color
  return getDefaultColor();
};

/**
 * Add a custom category
 */
export const addCustomCategory = (name: string, color: string): void => {
  // Don't allow overwriting predefined categories
  const predefined = PREDEFINED_CATEGORIES.find(c => c.name === name);
  if (predefined) {
    throw new Error(`Category "${name}" is a predefined category and cannot be overwritten`);
  }

  const customCategories = storage.loadCategories();
  
  // Check if category already exists
  const existingIndex = customCategories.findIndex(c => c.name === name);
  if (existingIndex >= 0) {
    // Update existing custom category
    customCategories[existingIndex] = { name, color };
  } else {
    // Add new custom category
    customCategories.push({ name, color });
  }

  storage.saveCategories(customCategories);
};

/**
 * Delete a custom category
 */
export const deleteCustomCategory = (name: string): void => {
  const customCategories = storage.loadCategories();
  const filtered = customCategories.filter(c => c.name !== name);
  storage.saveCategories(filtered);
};

/**
 * Check if a category name is predefined
 */
export const isPredefinedCategory = (name: string): boolean => {
  return PREDEFINED_CATEGORIES.some(c => c.name === name);
};
