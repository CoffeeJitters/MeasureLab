'use client';

import { MeasurementType } from '@/types';

interface ToolsProps {
  activeTool: MeasurementType | 'calibrate' | null;
  onToolSelect: (tool: MeasurementType | 'calibrate' | null) => void;
  isCalibrated: boolean;
}

export default function Tools({ activeTool, onToolSelect, isCalibrated }: ToolsProps) {
  const tools: { id: MeasurementType | 'calibrate'; label: string; icon: string }[] = [
    { id: 'calibrate', label: 'Calibrate Scale', icon: '📏' },
    { id: 'length', label: 'Length', icon: '📐' },
    { id: 'area', label: 'Area', icon: '⬛' },
    { id: 'count', label: 'Count', icon: '📍' },
  ];

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 mr-2">Tools:</span>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolSelect(activeTool === tool.id ? null : tool.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTool === tool.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={tool.id === 'calibrate' && !isCalibrated ? 'Calibrate scale to enable accurate measurements' : ''}
        >
          <span>{tool.icon}</span>
          <span>{tool.label}</span>
          {tool.id === 'calibrate' && !isCalibrated && (
            <span className="ml-1 text-xs">⚠️</span>
          )}
        </button>
      ))}
      {activeTool && (
        <button
          onClick={() => onToolSelect(null)}
          className="ml-auto text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

