'use client';

import { useState, useEffect } from 'react';
import { EstimateSettings, defaultEstimateSettings, getSheetAreaSF } from '@/lib/estimate/config';
import { Settings, Save, X } from 'lucide-react';

interface EstimateSettingsProps {
  settings: EstimateSettings;
  onSettingsChange: (settings: EstimateSettings) => void;
}

export default function EstimateSettingsComponent({ settings, onSettingsChange }: EstimateSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<EstimateSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setIsOpen(false);
  };

  const sheetSizeOptions: Array<{ value: '4x8' | '4x10' | '4x12'; label: string; area: number }> = [
    { value: '4x8', label: '4x8', area: 32 },
    { value: '4x10', label: '4x10', area: 40 },
    { value: '4x12', label: '4x12', area: 48 },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-xs bg-white/5 text-white/60 hover:bg-white/8 transition-all duration-75 flex items-center gap-2 rounded border border-white/5"
        title="Estimate Settings"
      >
        <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
        Settings
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-black/95 via-black/90 to-black/95 border border-white/10 rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-medium text-white/80 flex items-center gap-2">
                <Settings className="w-4 h-4" strokeWidth={1.5} />
                Estimate Settings
              </h2>
              <button
                onClick={handleCancel}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Default Wall Height */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Default Wall Height (ft)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="0.5"
                  value={localSettings.defaultWallHeightFt}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      defaultWallHeightFt: parseFloat(e.target.value) || 8,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/20 rounded transition-all"
                  placeholder="8"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  Used for Linear measurements when no override height is specified
                </p>
              </div>

              {/* Drywall Sheet Size */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Drywall Sheet Size
                </label>
                <select
                  value={localSettings.drywallSheetSize}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      drywallSheetSize: e.target.value as '4x8' | '4x10' | '4x12',
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20 rounded transition-all"
                >
                  {sheetSizeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black">
                      {option.label} ({option.area} SF)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-white/40 mt-1">
                  Sheet size used for calculating number of sheets needed
                </p>
              </div>

              {/* Waste Percent */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Waste Percent (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={localSettings.wastePercent}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      wastePercent: parseFloat(e.target.value) || 10,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/20 rounded transition-all"
                  placeholder="10"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  Waste factor applied to total drywall area (e.g., 10% = 1.10 multiplier)
                </p>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-white/5 flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-3 py-2 text-xs bg-white/10 text-white hover:bg-white/15 transition-all duration-75 flex items-center justify-center gap-2 rounded border border-white/10"
              >
                <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
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
        </div>
      )}
    </>
  );
}
