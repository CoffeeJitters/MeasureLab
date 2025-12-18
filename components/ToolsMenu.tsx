'use client';

import { useState, useRef, useEffect } from 'react';
import { MeasurementType } from '@/types';
import { getAllCategories, getToolColor, TOOL_COLORS } from '@/utils/categories';
import { 
  Ruler, 
  MoveHorizontal, 
  Square, 
  Target, 
  AlertCircle, 
  Settings,
  Palette,
  Type,
  Tag,
  ChevronDown
} from 'lucide-react';

interface ToolsMenuProps {
  activeTool: MeasurementType | 'calibrate' | null;
  onToolSelect: (tool: MeasurementType | 'calibrate' | null) => void;
  isCalibrated: boolean;
  defaultColor: string;
  defaultCategory: string;
  defaultType: MeasurementType | null;
  onColorChange: (color: string) => void;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: MeasurementType | null) => void;
}

export default function ToolsMenu({
  activeTool,
  onToolSelect,
  isCalibrated,
  defaultColor,
  defaultCategory,
  defaultType,
  onColorChange,
  onCategoryChange,
  onTypeChange,
}: ToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const categories = getAllCategories();

  const tools = [
    { 
      id: 'calibrate' as const, 
      label: 'Calibrate Scale', 
      icon: Ruler,
      color: '#6B7280'
    },
    { 
      id: 'length' as MeasurementType, 
      label: 'Length', 
      icon: MoveHorizontal,
      color: TOOL_COLORS.length
    },
    { 
      id: 'area' as MeasurementType, 
      label: 'Area', 
      icon: Square,
      color: TOOL_COLORS.area
    },
    { 
      id: 'count' as MeasurementType, 
      label: 'Count', 
      icon: Target,
      color: TOOL_COLORS.count
    },
  ];

  const toolColors = [
    { name: 'Length', value: TOOL_COLORS.length, type: 'length' as MeasurementType },
    { name: 'Area', value: TOOL_COLORS.area, type: 'area' as MeasurementType },
    { name: 'Count', value: TOOL_COLORS.count, type: 'count' as MeasurementType },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowDefaults(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToolSelect = (toolId: MeasurementType | 'calibrate') => {
    onToolSelect(activeTool === toolId ? null : toolId);
    if (toolId === 'calibrate') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 rounded-lg border border-white/10"
      >
        <Settings className="w-4 h-4" />
        <span>Tools</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 w-72 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
        >
          {/* Tools Section */}
          <div className="px-3 py-2 border-b border-white/5">
            <div className="text-xs text-white/60 mb-2 font-medium">Measurement Tools</div>
            <div className="space-y-1">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className={`w-full px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? tool.color : 'inherit' }} />
                    <span className="flex-1 text-left">{tool.label}</span>
                    {tool.id === 'calibrate' && !isCalibrated && (
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Defaults Toggle */}
          <button
            onClick={() => setShowDefaults(!showDefaults)}
            className="w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between border-b border-white/5"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Defaults</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDefaults ? 'rotate-180' : ''}`} />
          </button>

          {/* Defaults Section */}
          {showDefaults && (
            <div className="px-3 py-2 space-y-3">
              {/* Type Selection */}
              <div>
                <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                  <Type className="w-3.5 h-3.5" />
                  <span>Default Type</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onTypeChange(null)}
                    className={`flex-1 px-2.5 py-1.5 text-xs rounded transition-colors ${
                      defaultType === null
                        ? 'bg-white/15 text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    Auto
                  </button>
                  {toolColors.map((tool) => (
                    <button
                      key={tool.type}
                      onClick={() => onTypeChange(tool.type)}
                      className={`flex-1 px-2.5 py-1.5 text-xs rounded transition-colors ${
                        defaultType === tool.type
                          ? 'bg-white/15 text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Default Color</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={defaultColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="w-8 h-8 cursor-pointer rounded border border-white/10 hover:border-white/20 transition-colors bg-transparent"
                  />
                  <div className="flex-1 flex gap-1.5">
                    {toolColors.map((tool) => (
                      <button
                        key={tool.type}
                        onClick={() => onColorChange(tool.value)}
                        className={`flex-1 h-8 rounded border transition-all ${
                          defaultColor === tool.value
                            ? 'border-white/40 scale-105'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                        style={{ backgroundColor: tool.value }}
                        title={tool.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Default Category</span>
                </div>
                <select
                  value={defaultCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 text-white rounded focus:outline-none focus:border-white/20 hover:bg-white/8 transition-colors"
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
      )}
    </div>
  );
}
