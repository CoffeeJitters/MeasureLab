'use client';

import React from 'react';
import { MeasurementType } from '@/types';
import { Ruler, MoveHorizontal, Square, Target, AlertCircle, X } from 'lucide-react';
import { getToolColor } from '@/utils/categories';

interface ToolsProps {
  activeTool: MeasurementType | 'calibrate' | null;
  onToolSelect: (tool: MeasurementType | 'calibrate' | null) => void;
  isCalibrated: boolean;
}

export default function Tools({ activeTool, onToolSelect, isCalibrated }: ToolsProps) {
  const tools: { 
    id: MeasurementType | 'calibrate'; 
    label: string; 
    icon: React.ReactNode;
    color?: string;
  }[] = [
    { 
      id: 'calibrate', 
      label: 'Calibrate Scale', 
      icon: <Ruler className="w-4 h-4" />,
      color: '#6B7280' // Gray for calibrate
    },
    { 
      id: 'length', 
      label: 'Length', 
      icon: <MoveHorizontal className="w-4 h-4" />,
      color: getToolColor('length')
    },
    { 
      id: 'area', 
      label: 'Area', 
      icon: <Square className="w-4 h-4" />,
      color: getToolColor('area')
    },
    { 
      id: 'count', 
      label: 'Count', 
      icon: <Target className="w-4 h-4" />,
      color: getToolColor('count')
    },
  ];

  const getToolStyles = (tool: typeof tools[0]) => {
    const isActive = activeTool === tool.id;
    const toolColor = tool.color || '#6B7280';
    
    if (isActive) {
      return {
        backgroundColor: `${toolColor}20`,
        color: toolColor,
        borderColor: `${toolColor}50`,
        boxShadow: `0 0 0 1px ${toolColor}30, 0 4px 16px ${toolColor}20`,
      };
    }
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: 'rgba(255, 255, 255, 0.7)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
    };
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-white/80 mr-1">Tools:</span>
      <div className="flex items-center gap-2">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          const styles = getToolStyles(tool);
          const toolColor = tool.color || '#6B7280';
          
          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(activeTool === tool.id ? null : tool.id)}
              className="px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 rounded-lg border hover:scale-[1.02] active:scale-[0.98]"
              style={{
                ...styles,
                ...(isActive && {
                  fontWeight: '600',
                }),
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = `${toolColor}30`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title={tool.id === 'calibrate' && !isCalibrated ? 'Calibrate scale to enable accurate measurements' : ''}
            >
              <span style={{ color: isActive ? toolColor : 'inherit', display: 'flex', alignItems: 'center' }}>
                {tool.icon}
              </span>
              <span>{tool.label}</span>
              {tool.id === 'calibrate' && !isCalibrated && (
                <AlertCircle className="w-3 h-3 text-yellow-400 ml-1" />
              )}
            </button>
          );
        })}
      </div>
      {activeTool && (
        <button
          onClick={() => onToolSelect(null)}
          className="ml-auto text-sm text-white/60 hover:text-white transition-all duration-200 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98]"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      )}
    </div>
  );
}

