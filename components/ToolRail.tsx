'use client';

import { useState } from 'react';
import { MeasurementType } from '@/types';
import { getAllCategories, TOOL_COLORS } from '@/utils/categories';
import { 
  Ruler, 
  MoveHorizontal, 
  Square, 
  Target, 
  List,
  DollarSign,
  MousePointer2,
  Hand
} from 'lucide-react';
import ToolbarButton from './ToolbarButton';

interface ToolRailProps {
  activeTool: MeasurementType | 'calibrate' | 'select' | 'pan' | null;
  onToolSelect: (tool: MeasurementType | 'calibrate' | 'select' | 'pan' | null) => void;
  isCalibrated: boolean;
  defaultColor: string;
  defaultCategory: string;
  defaultType: MeasurementType | null;
  onColorChange: (color: string) => void;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: MeasurementType | null) => void;
  rightPanelMode?: 'takeoff' | 'estimate';
  onRightPanelModeChange?: (mode: 'takeoff' | 'estimate') => void;
  onEstimateClick?: () => void;
}

export default function ToolRail({
  activeTool,
  onToolSelect,
  isCalibrated,
  defaultColor,
  defaultCategory,
  defaultType,
  onColorChange,
  onCategoryChange,
  onTypeChange,
  rightPanelMode,
  onRightPanelModeChange,
  onEstimateClick,
}: ToolRailProps) {

  const measureTools = [
    { 
      id: 'length' as MeasurementType, 
      label: 'Linear', 
      icon: MoveHorizontal,
      color: TOOL_COLORS.length,
      unit: 'ft'
    },
    { 
      id: 'area' as MeasurementType, 
      label: 'Surface', 
      icon: Square,
      color: TOOL_COLORS.area,
      unit: 'sq ft'
    },
    { 
      id: 'count' as MeasurementType, 
      label: 'Count', 
      icon: Target,
      color: TOOL_COLORS.count,
      unit: 'ea'
    },
  ];


  const handleToolSelect = (toolId: MeasurementType | 'calibrate' | 'select' | 'pan') => {
    onToolSelect(activeTool === toolId ? null : toolId);
  };

  return (
    <div className="w-full h-auto bg-gradient-to-r from-black/90 via-black/85 to-black/90 border-t border-white/5 flex flex-col">
      {/* Main Tool Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-6">
        {/* Left Side - Sections side by side */}
        <div className="flex items-center gap-6">
          {/* Select Section */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mr-1">
              Select
            </div>
            <button
              onClick={() => handleToolSelect('select')}
              className={`w-[88px] h-9 px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                activeTool === 'select' ? 'bg-white/5' : 'bg-transparent'
              } hover:bg-white/3`}
            >
              {activeTool === 'select' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-white/40" />
              )}
              <MousePointer2 
                className={`w-4 h-4 transition-colors ${
                  activeTool === 'select'
                    ? 'text-white'
                    : 'text-white/50 group-hover:text-white/70'
                }`}
                strokeWidth={1.5}
              />
              <span className={`text-sm transition-colors ${
                activeTool === 'select'
                  ? 'text-white font-medium'
                  : 'text-white/60 group-hover:text-white/80'
              }`}>
                Select
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/5" />

          {/* Pan Section */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mr-1">
              Navigate
            </div>
            <button
              onClick={() => handleToolSelect('pan')}
              className={`w-[88px] h-9 px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                activeTool === 'pan' ? 'bg-white/5' : 'bg-transparent'
              } hover:bg-white/3`}
            >
              {activeTool === 'pan' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-white/40" />
              )}
              <Hand 
                className={`w-4 h-4 transition-colors ${
                  activeTool === 'pan'
                    ? 'text-white'
                    : 'text-white/50 group-hover:text-white/70'
                }`}
                strokeWidth={1.5}
              />
              <span className={`text-sm transition-colors ${
                activeTool === 'pan'
                  ? 'text-white font-medium'
                  : 'text-white/60 group-hover:text-white/80'
              }`}>
                Pan
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/5" />

          {/* Measure Section */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mr-1">
              Measure
            </div>
            <div className="flex items-center gap-1">
              {measureTools.map((tool) => {
                const isActive = activeTool === tool.id;
                
                return (
                  <ToolbarButton
                    key={tool.id}
                    label={tool.label}
                    icon={tool.icon}
                    isActive={isActive}
                    onClick={() => handleToolSelect(tool.id)}
                    activeColor={tool.color}
                    activeIndicatorColor={tool.color}
                  />
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/5" />

          {/* Calibrate Section */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mr-1">
              Calibrate
            </div>
            <button
              onClick={() => handleToolSelect('calibrate')}
              disabled={false}
              className={`w-[88px] h-9 px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                activeTool === 'calibrate' ? 'bg-white/5' : 'bg-transparent'
              } hover:bg-white/3 ${!isCalibrated ? 'opacity-100' : 'opacity-70'}`}
              title={!isCalibrated ? 'Calibrate scale to enable accurate measurements' : 'Scale already calibrated'}
            >
              {activeTool === 'calibrate' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-white/40" />
              )}
              <Ruler 
                className={`w-4 h-4 transition-colors ${
                  activeTool === 'calibrate'
                    ? 'text-white'
                    : 'text-white/50 group-hover:text-white/70'
                }`}
                strokeWidth={1.5}
              />
              <span className={`text-sm transition-colors ${
                activeTool === 'calibrate'
                  ? 'text-white font-medium'
                  : 'text-white/60 group-hover:text-white/80'
              }`}>
                Scale
              </span>
              {!isCalibrated && (
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
              )}
            </button>
          </div>

        </div>

        {/* Panel Section - Right side */}
        {rightPanelMode !== undefined && onRightPanelModeChange && (
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mr-1">
              Panel
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRightPanelModeChange('takeoff')}
                className={`w-[88px] h-9 px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                  rightPanelMode === 'takeoff' ? 'bg-white/5' : 'bg-transparent'
                } hover:bg-white/3`}
                title="Show Takeoff List"
              >
                {rightPanelMode === 'takeoff' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-white/40" />
                )}
                <List 
                  className={`w-4 h-4 transition-colors ${
                    rightPanelMode === 'takeoff'
                      ? 'text-white'
                      : 'text-white/50 group-hover:text-white/70'
                  }`}
                  strokeWidth={1.5}
                />
                <span className={`text-sm transition-colors ${
                  rightPanelMode === 'takeoff'
                    ? 'text-white font-medium'
                    : 'text-white/60 group-hover:text-white/80'
                }`}>
                  Takeoff
                </span>
              </button>
              <button
                onClick={() => onEstimateClick?.()}
                className="w-[88px] h-9 px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative bg-transparent hover:bg-white/3"
                title="Open Estimate"
              >
                <DollarSign 
                  className="w-4 h-4 transition-colors text-white/50 group-hover:text-white/70"
                  strokeWidth={1.5}
                />
                <span className="text-sm transition-colors text-white/60 group-hover:text-white/80">
                  Estimate
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
