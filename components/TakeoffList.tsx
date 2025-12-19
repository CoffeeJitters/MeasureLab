'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Measurement, MeasurementType, Category, Group } from '@/types';
import { formatMeasurementValue, exportToCSV } from '@/utils/measurements';
import { getAllCategories, getCategoryColor, addCustomCategory } from '@/utils/categories';
import { groupMeasurements, GroupedData } from '@/utils/measurementGrouping';
import { updateSelectionWithModifiers } from '@/utils/selection';
import { Download, Edit, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface TakeoffListProps {
  measurements: Measurement[];
  groups: Group[];
  onMeasurementUpdate: (id: string, updates: Partial<Measurement>) => void;
  onMeasurementDelete: (id: string) => void;
  onMeasurementSelect: (id: string | null) => void;
  selectedMeasurementId: string | null;
  selectedMeasurementIds?: Set<string>;
  onMeasurementSelectMultiple?: (ids: Set<string>) => void;
}

export default function TakeoffList({
  measurements,
  groups,
  onMeasurementUpdate,
  onMeasurementDelete,
  onMeasurementSelect,
  selectedMeasurementId,
  selectedMeasurementIds = new Set(),
  onMeasurementSelectMultiple,
}: TakeoffListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editOverrideHeight, setEditOverrideHeight] = useState<string>('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryColor, setCustomCategoryColor] = useState('#3B82F6');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories only on client side
  useEffect(() => {
    setCategories(getAllCategories());
  }, []);

  // Build the grouped data structure
  const groupedData = useMemo((): GroupedData[] => {
    return groupMeasurements(measurements, groups);
  }, [measurements, groups]);

  // Handle multi-select
  const handleMeasurementClick = useCallback((e: React.MouseEvent, measurementId: string) => {
    if (!onMeasurementSelectMultiple) {
      // Fallback to single select
      onMeasurementSelect(measurementId);
      return;
    }

    const newSelection = updateSelectionWithModifiers(
      selectedMeasurementIds,
      measurementId,
      e.shiftKey,
      e.ctrlKey,
      e.metaKey
    );
    onMeasurementSelectMultiple(newSelection);
  }, [selectedMeasurementIds, onMeasurementSelectMultiple, onMeasurementSelect]);

  // Prevent native text selection when using modifier keys
  const handleRowMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if the target is an input, textarea, select, or contenteditable element
    const target = e.target as HTMLElement;
    const isEditableElement = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest('input, textarea, select, [contenteditable]');

    // Only prevent default if using modifier keys and NOT clicking on an editable element
    if ((e.shiftKey || e.ctrlKey || e.metaKey) && !isEditableElement) {
      e.preventDefault();
    }
  }, []);

  // Handle Ctrl/Cmd+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (onMeasurementSelectMultiple) {
          onMeasurementSelectMultiple(new Set(measurements.map(m => m.id)));
        }
      } else if (e.key === 'Escape') {
        if (onMeasurementSelectMultiple) {
          onMeasurementSelectMultiple(new Set());
        } else {
          onMeasurementSelect(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [measurements, onMeasurementSelectMultiple, onMeasurementSelect]);

  const handleEdit = (measurement: Measurement) => {
    setEditingId(measurement.id);
    setEditName(measurement.name);
    setEditNotes(measurement.notes || '');
    setEditCategory(measurement.category || '');
    setEditOverrideHeight(measurement.overrideHeight?.toString() || '');
    setShowCustomCategory(false);
    setCustomCategoryName('');
    setCustomCategoryColor('#3B82F6');
  };

  const handleSave = (id: string) => {
    let category = editCategory;
    let color = getCategoryColor(category);

    // If custom category was created, add it
    if (showCustomCategory && customCategoryName.trim()) {
      try {
        addCustomCategory(customCategoryName.trim(), customCategoryColor);
        category = customCategoryName.trim();
        color = customCategoryColor;
        // Refresh categories list
        setCategories(getAllCategories());
      } catch (error) {
        console.error('Failed to add custom category:', error);
      }
    }

    // Find the measurement to check its type
    const measurement = measurements.find(m => m.id === id);
    
    // Parse overrideHeight for Linear measurements
    const overrideHeight = measurement?.type === 'length' && editOverrideHeight.trim() 
      ? parseFloat(editOverrideHeight) || undefined
      : undefined;

    onMeasurementUpdate(id, { 
      name: editName, 
      notes: editNotes,
      category: category || undefined,
      color: color,
      overrideHeight: overrideHeight
    });
    setEditingId(null);
    setEditName('');
    setEditNotes('');
    setEditCategory('');
    setEditOverrideHeight('');
    setShowCustomCategory(false);
    setCustomCategoryName('');
    setCustomCategoryColor('#3B82F6');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditNotes('');
    setEditCategory('');
    setEditOverrideHeight('');
    setShowCustomCategory(false);
    setCustomCategoryName('');
    setCustomCategoryColor('#3B82F6');
  };

  const toggleGroup = (groupId: string | null) => {
    const key = groupId ?? 'ungrouped';
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleType = (groupId: string | null, type: string) => {
    const key = `${groupId ?? 'ungrouped'}-${type}`;
    setCollapsedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const renderMeasurement = (measurement: Measurement) => {
    const isSelected = selectedMeasurementIds.has(measurement.id) || selectedMeasurementId === measurement.id;
    
    return (
      <div
        key={measurement.id}
        className={`px-3 py-2 border rounded cursor-pointer transition-all duration-75 select-none ${
          isSelected
            ? 'bg-white/10 border-white/20'
            : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8'
        }`}
        onClick={(e) => handleMeasurementClick(e, measurement.id)}
        onMouseDown={handleRowMouseDown}
      >
        {editingId === measurement.id ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/20 rounded transition-all duration-75"
              placeholder="Name"
              autoFocus
              onMouseDown={(e) => e.stopPropagation()}
            />
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Category</label>
              <select
                value={showCustomCategory ? 'custom' : editCategory}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setShowCustomCategory(true);
                    setEditCategory('');
                  } else if (e.target.value === '') {
                    setShowCustomCategory(false);
                    setEditCategory('');
                  } else {
                    setShowCustomCategory(false);
                    setEditCategory(e.target.value);
                  }
                }}
                className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20 rounded transition-all duration-75"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <option value="" className="bg-black">None</option>
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name} className="bg-black">
                    {cat.name}
                  </option>
                ))}
                <option value="custom" className="bg-black">Custom...</option>
              </select>
              {showCustomCategory && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/20 rounded transition-colors duration-75"
                    placeholder="Category name"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-white/40">Color:</label>
                    <input
                      type="color"
                      value={customCategoryColor}
                      onChange={(e) => setCustomCategoryColor(e.target.value)}
                      className="w-8 h-6 cursor-pointer rounded border border-white/10"
                    />
                    <div
                      className="w-5 h-5 rounded border border-white/10"
                      style={{ backgroundColor: customCategoryColor }}
                    />
                  </div>
                </div>
              )}
            </div>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/20 rounded transition-colors duration-75"
              placeholder="Notes (optional)"
              rows={2}
              onMouseDown={(e) => e.stopPropagation()}
            />
            {measurement.type === 'length' && (
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
                  Wall Height Override (ft)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="0.5"
                  value={editOverrideHeight}
                  onChange={(e) => setEditOverrideHeight(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/20 rounded transition-colors duration-75"
                  placeholder="Leave empty to use default"
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <p className="text-[10px] text-white/30 mt-0.5">
                  Optional: Override default wall height for this measurement
                </p>
              </div>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={() => handleSave(measurement.id)}
                className="flex-1 px-3 py-2 text-xs bg-white/5 text-white hover:bg-white/8 transition-all duration-75 flex items-center justify-center gap-2 rounded border border-white/5"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-2 text-xs bg-white/5 text-white/60 hover:bg-white/8 hover:text-white/80 transition-all duration-75 flex items-center justify-center gap-2 rounded border border-white/5"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: measurement.color }}
                  />
                  <p className="text-xs font-medium text-white/80">{measurement.name}</p>
                  {measurement.category && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${measurement.color}20`,
                        color: measurement.color,
                        border: `1px solid ${measurement.color}30`
                      }}
                    >
                      {measurement.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 mt-0.5">
                  {formatMeasurementValue(measurement.value, measurement.units, measurement.type)}
                  {measurement.type === 'length' && measurement.overrideHeight && (
                    <span className="text-[10px] text-white/40 ml-1">
                      (h: {measurement.overrideHeight}ft)
                    </span>
                  )}
                </p>
                {measurement.notes && (
                  <p className="text-[10px] text-white/40 mt-0.5">{measurement.notes}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(measurement);
                  }}
                  className="text-white/30 hover:text-white/60 transition-colors duration-75"
                  title="Edit"
                >
                  <Edit className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMeasurementDelete(measurement.id);
                  }}
                  className="text-white/30 hover:text-white/60 transition-colors duration-75"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };


  const renderTypeSection = (
    type: 'length' | 'area' | 'count',
    items: Measurement[] | Record<string, Measurement[]>,
    groupId: string | null
  ) => {
    const typeKey = `${groupId ?? 'ungrouped'}-${type}`;
    const isCollapsed = collapsedTypes.has(typeKey);
    const typeLabel = type.toUpperCase();

    if (type === 'count') {
      const countItems = items as Record<string, Measurement[]>;
      const labelKeys = Object.keys(countItems).sort();
      
      if (labelKeys.length === 0) return null;

      return (
        <div className="mb-3">
          <button
            onClick={() => toggleType(groupId, type)}
            className="flex items-center gap-2 w-full mb-2 px-1 py-1 hover:bg-white/5 rounded transition-colors duration-75 group"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
            )}
            <h4 className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{typeLabel}</h4>
          </button>
            {!isCollapsed && (
              <div className="space-y-1.5 ml-4">
                {labelKeys.map(label => (
                  <div key={label} className="mb-2">
                    <div className="text-[10px] text-white/40 mb-1 px-1">{label}</div>
                    <div className="space-y-1">
                      {countItems[label].map(m => renderMeasurement(m))}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      );
    } else {
      const typeItems = items as Measurement[];
      if (typeItems.length === 0) return null;

      return (
        <div className="mb-3">
          <button
            onClick={() => toggleType(groupId, type)}
            className="flex items-center gap-2 w-full mb-2 px-1 py-1 hover:bg-white/5 rounded transition-colors duration-75 group"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
            )}
            <h4 className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{typeLabel}</h4>
          </button>
          {!isCollapsed && (
            <div className="space-y-1.5 ml-4">
              {typeItems.map(m => renderMeasurement(m))}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="w-80 bg-gradient-to-b from-black/90 via-black/85 to-black/90 border-l border-white/5 flex flex-col h-screen">
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-white/80">Takeoff List</h2>
          <button
            onClick={() => exportToCSV(measurements)}
            disabled={measurements.length === 0}
            className="px-3 py-2 text-xs bg-white/5 text-white/60 hover:bg-white/8 disabled:bg-white/3 disabled:text-white/30 disabled:cursor-not-allowed transition-all duration-75 flex items-center gap-2 rounded border border-white/5"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 select-none">
        {measurements.length === 0 ? (
          <div className="text-center text-white/40 text-xs mt-8">
            No measurements yet. Use the tools above to start measuring.
          </div>
        ) : (
          groupedData.map((groupData) => {
            const groupKey = groupData.groupId ?? 'ungrouped';
            const isGroupCollapsed = collapsedGroups.has(groupKey);
            const hasAnyMeasurements = 
              groupData.measurements.length.length > 0 ||
              groupData.measurements.area.length > 0 ||
              Object.keys(groupData.measurements.count).length > 0;

            if (!hasAnyMeasurements) return null;

            return (
              <div key={groupKey} className="mb-4">
                <button
                  onClick={() => toggleGroup(groupData.groupId)}
                  className="flex items-center justify-between w-full mb-2 px-2 py-2 hover:bg-white/5 rounded transition-colors duration-75 group border border-white/5 bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    {isGroupCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
                    )}
                    <h3 className="text-xs font-medium text-white/80">{groupData.groupName}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/50">
                    {groupData.totals.length > 0 && (
                      <span>{formatMeasurementValue(groupData.totals.length, 'ft', 'length')}</span>
                    )}
                    {groupData.totals.area > 0 && (
                      <span>{formatMeasurementValue(groupData.totals.area, 'ft', 'area')}</span>
                    )}
                    {groupData.totals.count > 0 && (
                      <span>{groupData.totals.count} ea</span>
                    )}
                  </div>
                </button>
                {!isGroupCollapsed && (
                  <div className="ml-2 space-y-2">
                    {renderTypeSection('length', groupData.measurements.length, groupData.groupId)}
                    {renderTypeSection('area', groupData.measurements.area, groupData.groupId)}
                    {renderTypeSection('count', groupData.measurements.count, groupData.groupId)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
