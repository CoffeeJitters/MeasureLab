'use client';

import { useState, useRef, useEffect } from 'react';
import { MeasurementType } from '@/types';
import { getAllCategories, getToolColor, TOOL_COLORS } from '@/utils/categories';
import { Settings, Palette, Type, Tag } from 'lucide-react';

interface MeasurementDefaultsProps {
  defaultColor: string;
  defaultCategory: string;
  defaultType: MeasurementType | null;
  onColorChange: (color: string) => void;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: MeasurementType | null) => void;
}

export default function MeasurementDefaults({
  defaultColor,
  defaultCategory,
  defaultType,
  onColorChange,
  onCategoryChange,
  onTypeChange,
}: MeasurementDefaultsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const categories = getAllCategories();

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
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 rounded"
      >
        <Settings className="w-4 h-4" />
        <span>Defaults</span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 w-64 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
        >
          {/* Type Selection */}
          <div className="px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
              <Type className="w-3.5 h-3.5" />
              <span>Type</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  onTypeChange(null);
                  setIsOpen(false);
                }}
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
                  onClick={() => {
                    onTypeChange(tool.type);
                    setIsOpen(false);
                  }}
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
          <div className="px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
              <Palette className="w-3.5 h-3.5" />
              <span>Color</span>
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
                    onClick={() => {
                      onColorChange(tool.value);
                      setIsOpen(false);
                    }}
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
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
              <Tag className="w-3.5 h-3.5" />
              <span>Category</span>
            </div>
            <select
              value={defaultCategory}
              onChange={(e) => {
                onCategoryChange(e.target.value);
                setIsOpen(false);
              }}
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
  );
}
