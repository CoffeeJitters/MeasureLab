'use client';

import { useState } from 'react';
import { MeasurementType } from '@/types';
import { getAllCategories, TOOL_COLORS } from '@/utils/categories';
import { 
  Ruler, 
  MoveHorizontal, 
  Square, 
  Target, 
  Settings,
  Palette,
  Type,
  Tag,
  ChevronDown,
  ChevronUp,
  List,
  DollarSign
} from 'lucide-react';

interface ToolRailProps {
  activeTool: MeasurementType | 'calibrate' | null;
  onToolSelect: (tool: MeasurementType | 'calibrate' | null) => void;
  isCalibrated: boolean;
  defaultColor: string;
  defaultCategory: string;
  defaultType: MeasurementType | null;
  onColorChange: (color: string) => void;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: MeasurementType | null) => void;
  rightPanelMode?: 'takeoff' | 'estimate';
  onRightPanelModeChange?: (mode: 'takeoff' | 'estimate') => void;
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
}: ToolRailProps) {
  const [showDefaults, setShowDefaults] = useState(false);
  const categories = getAllCategories();

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
      unit: ''
    },
  ];

  const toolColors = [
    { name: 'Linear', value: TOOL_COLORS.length, type: 'length' as MeasurementType },
    { name: 'Surface', value: TOOL_COLORS.area, type: 'area' as MeasurementType },
    { name: 'Count', value: TOOL_COLORS.count, type: 'count' as MeasurementType },
  ];

  const handleToolSelect = (toolId: MeasurementType | 'calibrate') => {
    onToolSelect(activeTool === toolId ? null : toolId);
  };

  return (
    <div className="w-full h-auto bg-gradient-to-r from-black/90 via-black/85 to-black/90 border-t border-white/5 flex flex-col">
      {/* Main Tool Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-6">
        {/* Left Side - Sections side by side */}
        <div className="flex items-center gap-6">
          {/* Measure Section */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mr-1">
              Measure
            </div>
            <div className="flex items-center gap-1">
              {measureTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                const isCount = tool.id === 'count';
                
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className={`px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                      isActive
                        ? 'bg-white/5'
                        : 'hover:bg-white/3'
                    }`}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                        style={{ backgroundColor: tool.color }}
                      />
                    )}
                    
                    {/* Icon */}
                    <Icon 
                      className={`w-4 h-4 transition-colors ${
                        isActive 
                          ? 'text-white' 
                          : 'text-white/50 group-hover:text-white/70'
                      }`}
                      style={isActive ? { color: tool.color } : undefined}
                      strokeWidth={1.5}
                    />
                    
                    {/* Label */}
                    <span className={`text-sm transition-colors ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-white/60 group-hover:text-white/80'
                    }`}>
                      {tool.label}
                    </span>
                    
                    {/* Unit hint (only when active) */}
                    {isActive && tool.unit && (
                      <span className="text-[10px] text-white/40 font-medium">
                        {tool.unit}
                      </span>
                    )}
                    
                    {/* Count visual distinction */}
                    {isCount && !isActive && (
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                    )}
                  </button>
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
              className={`px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                activeTool === 'calibrate'
                  ? 'bg-white/5'
                  : 'hover:bg-white/3'
              } ${!isCalibrated ? 'opacity-100' : 'opacity-70'}`}
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

          {/* Divider */}
          <div className="w-px h-6 bg-white/5" />

          {/* Manage Section - Defaults */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mr-1">
              Manage
            </div>
            <button
              onClick={() => setShowDefaults(!showDefaults)}
              className="px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group hover:bg-white/3"
            >
              <Settings 
                className="w-4 h-4 text-white/50 group-hover:text-white/70 transition-colors"
                strokeWidth={1.5}
              />
              <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                Defaults
              </span>
              {showDefaults ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/40" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
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
                className={`px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                  rightPanelMode === 'takeoff'
                    ? 'bg-white/5'
                    : 'hover:bg-white/3'
                }`}
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
                onClick={() => onRightPanelModeChange('estimate')}
                className={`px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
                  rightPanelMode === 'estimate'
                    ? 'bg-white/5'
                    : 'hover:bg-white/3'
                }`}
                title="Show Estimate"
              >
                {rightPanelMode === 'estimate' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-white/40" />
                )}
                <DollarSign 
                  className={`w-4 h-4 transition-colors ${
                    rightPanelMode === 'estimate'
                      ? 'text-white'
                      : 'text-white/50 group-hover:text-white/70'
                  }`}
                  strokeWidth={1.5}
                />
                <span className={`text-sm transition-colors ${
                  rightPanelMode === 'estimate'
                    ? 'text-white font-medium'
                    : 'text-white/60 group-hover:text-white/80'
                }`}>
                  Estimate
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Defaults Inline Panel */}
      {showDefaults && (
        <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center gap-6">
          {/* Type Selection */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Type className="w-3 h-3 text-white/40" strokeWidth={1.5} />
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Type</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onTypeChange(null)}
                className={`px-2 py-1.5 text-xs rounded transition-colors duration-75 ${
                  defaultType === null
                    ? 'bg-white/10 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/8 hover:text-white/80'
                }`}
              >
                Auto
              </button>
              {toolColors.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() => onTypeChange(tool.type)}
                  className={`px-2 py-1.5 text-xs rounded transition-colors duration-75 ${
                    defaultType === tool.type
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/8 hover:text-white/80'
                  }`}
                >
                  {tool.name}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/5" />

          {/* Color Selection */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-white/40" strokeWidth={1.5} />
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Color</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={defaultColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-7 h-7 cursor-pointer rounded border border-white/10 hover:border-white/20 transition-colors bg-transparent"
              />
              <div className="flex gap-1">
                {toolColors.map((tool) => (
                  <button
                    key={tool.type}
                    onClick={() => onColorChange(tool.value)}
                    className={`w-7 h-7 rounded border transition-all duration-75 ${
                      defaultColor === tool.value
                        ? 'border-white/30 scale-[1.02]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    style={{ backgroundColor: tool.value }}
                    title={tool.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/5" />

          {/* Category Selection */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-white/40" strokeWidth={1.5} />
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Category</span>
            </div>
            <select
              value={defaultCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white rounded focus:outline-none focus:border-white/20 hover:bg-white/8 transition-colors duration-75"
            >
              <option value="" className="bg-black">None</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name} className="bg-black">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
