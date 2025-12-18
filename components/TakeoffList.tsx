'use client';

import { useState, useMemo } from 'react';
import { Measurement, MeasurementType } from '@/types';
import { formatMeasurementValue, exportToCSV } from '@/utils/measurements';

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
  };

  const handleSave = (id: string) => {
    onMeasurementUpdate(id, { name: editName, notes: editNotes });
    setEditingId(null);
    setEditName('');
    setEditNotes('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditNotes('');
  };

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
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Takeoff List</h2>
          <button
            onClick={() => exportToCSV(measurements)}
            disabled={measurements.length === 0}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Export CSV
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Group by:</span>
          <button
            onClick={() => setGroupBy('type')}
            className={`px-2 py-1 text-xs rounded ${
              groupBy === 'type' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Type
          </button>
          <button
            onClick={() => setGroupBy('none')}
            className={`px-2 py-1 text-xs rounded ${
              groupBy === 'none' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            None
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {measurements.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            No measurements yet. Use the tools above to start measuring.
          </div>
        ) : (
          Object.entries(groupedMeasurements).map(([groupName, groupMeasurements]) => (
            <div key={groupName} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">{groupName}</h3>
                {groupBy === 'type' && (
                  <span className="text-xs text-gray-500">
                    Total: {formatMeasurementValue(totalByType[groupName.toLowerCase() as MeasurementType], 'ft', groupName.toLowerCase() as MeasurementType)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {groupMeasurements.map((measurement) => (
                  <div
                    key={measurement.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMeasurementId === measurement.id
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onMeasurementSelect(measurement.id)}
                  >
                    {editingId === measurement.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Name"
                          autoFocus
                        />
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Notes (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(measurement.id)}
                            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
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
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: measurement.color }}
                              />
                              <p className="text-sm font-medium text-gray-800">{measurement.name}</p>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatMeasurementValue(measurement.value, measurement.units, measurement.type)}
                            </p>
                            {measurement.notes && (
                              <p className="text-xs text-gray-500 mt-1">{measurement.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(measurement);
                              }}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMeasurementDelete(measurement.id);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

