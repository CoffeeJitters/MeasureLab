'use client';

import { useState, useMemo } from 'react';
import { Measurement, MeasurementType } from '@/types';
import { formatMeasurementValue, exportToCSV } from '@/utils/measurements';
import { getAllCategories, getCategoryColor, addCustomCategory } from '@/utils/categories';
import { Download, Edit, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface TakeoffListProps {
  measurements: Measurement[];
  onMeasurementUpdate: (id: string, updates: Partial<Measurement>) => void;
  onMeasurementDelete: (id: string) => void;
  onMeasurementSelect: (id: string | null) => void;
  selectedMeasurementId: string | null;
}

export default function TakeoffList({
  measurements,
  onMeasurementUpdate,
  onMeasurementDelete,
  onMeasurementSelect,
  selectedMeasurementId,
}: TakeoffListProps) {
  const [groupBy, setGroupBy] = useState<'type' | 'none'>('type');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryColor, setCustomCategoryColor] = useState('#3B82F6');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groupedMeasurements = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All': measurements };
    }

    const groups: Record<string, Measurement[]> = {};
    measurements.forEach((m) => {
      const key = m.type.charAt(0).toUpperCase() + m.type.slice(1);
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [measurements, groupBy]);

  const handleEdit = (measurement: Measurement) => {
    setEditingId(measurement.id);
    setEditName(measurement.name);
    setEditNotes(measurement.notes || '');
    setEditCategory(measurement.category || '');
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
      } catch (error) {
        console.error('Failed to add custom category:', error);
      }
    }

    onMeasurementUpdate(id, { 
      name: editName, 
      notes: editNotes,
      category: category || undefined,
      color: color
    });
    setEditingId(null);
    setEditName('');
    setEditNotes('');
    setEditCategory('');
    setShowCustomCategory(false);
    setCustomCategoryName('');
    setCustomCategoryColor('#3B82F6');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditNotes('');
    setEditCategory('');
    setShowCustomCategory(false);
    setCustomCategoryName('');
    setCustomCategoryColor('#3B82F6');
  };

  const categories = getAllCategories();

  const totalByType = useMemo(() => {
    const totals: Record<MeasurementType, number> = {
      length: 0,
      area: 0,
      count: 0,
    };
    measurements.forEach((m) => {
      totals[m.type] += m.value;
    });
    return totals;
  }, [measurements]);

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
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Group by:</span>
          <button
            onClick={() => setGroupBy('type')}
            className={`px-3 py-2 text-xs transition-all duration-75 rounded ${
              groupBy === 'type' ? 'bg-white/5 text-white border border-white/5' : 'bg-white/5 text-white/60 border border-white/5 hover:bg-white/8 hover:text-white/80'
            }`}
          >
            Type
          </button>
          <button
            onClick={() => setGroupBy('none')}
            className={`px-3 py-2 text-xs transition-all duration-75 rounded ${
              groupBy === 'none' ? 'bg-white/5 text-white border border-white/5' : 'bg-white/5 text-white/60 border border-white/5 hover:bg-white/8 hover:text-white/80'
            }`}
          >
            None
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {measurements.length === 0 ? (
          <div className="text-center text-white/40 text-xs mt-8">
            No measurements yet. Use the tools above to start measuring.
          </div>
        ) : (
          Object.entries(groupedMeasurements).map(([groupName, groupMeasurements]) => {
            const isCollapsed = collapsedGroups.has(groupName);
            return (
            <div key={groupName} className="mb-4">
              <button
                onClick={() => {
                  setCollapsedGroups(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(groupName)) {
                      newSet.delete(groupName);
                    } else {
                      newSet.add(groupName);
                    }
                    return newSet;
                  });
                }}
                className="flex items-center justify-between w-full mb-2 px-1 py-1 hover:bg-white/5 rounded transition-colors duration-75 group"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
                  )}
                  <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">{groupName}</h3>
                </div>
                {groupBy === 'type' && (
                  <span className="text-[10px] text-white/40">
                    {formatMeasurementValue(totalByType[groupName.toLowerCase() as MeasurementType], 'ft', groupName.toLowerCase() as MeasurementType)}
                  </span>
                )}
              </button>
              {!isCollapsed && (
              <div className="space-y-1.5">
                {groupMeasurements.map((measurement) => (
                  <div
                    key={measurement.id}
                    className={`px-3 py-2 border rounded cursor-pointer transition-all duration-75 ${
                      selectedMeasurementId === measurement.id
                        ? 'bg-white/5 border-white/10'
                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8'
                    }`}
                    onClick={() => onMeasurementSelect(measurement.id)}
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
                        />
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
                ))}
              </div>
              )}
            </div>
          )})
        )}
      </div>
    </div>
  );
}

