'use client';

import { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { Measurement } from '@/types';
import { mapTakeoffToEstimateInputs } from '@/lib/estimate/fromTakeoff';
import { calculateEstimate } from '@/lib/estimate/calc';
import { EstimateResult } from '@/lib/estimate/types';
import { EstimateSettings, defaultEstimateSettings } from '@/lib/estimate/config';
import { storage } from '@/utils/storage';
import EstimateSettingsComponent from './EstimateSettings';
import { DollarSign, Package, Clock, FileText, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { EstimateLineItem } from '@/lib/estimate/types';

interface EstimatePanelProps {
  measurements: Measurement[];
  isOpen: boolean;
  onClose: () => void;
}

// Format functions moved outside component to prevent recreation on every render
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number, decimals: number = 1) => {
  return value.toFixed(decimals);
};

// Compact Line Item component - single line with columns
interface CompactLineItemProps {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

const CompactLineItem = memo(({ description, quantity, unit, unitPrice, total }: CompactLineItemProps) => {
  const qtyDisplay = unit ? `${formatNumber(quantity, quantity % 1 === 0 ? 0 : 1)} ${unit}` : formatNumber(quantity, quantity % 1 === 0 ? 0 : 1);
  const unitCostDisplay = unitPrice > 0 ? formatCurrency(unitPrice) : '-';
  
  return (
    <div 
      className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center py-1.5 border-b border-white/5 last:border-0 text-xs"
      title={description}
    >
      <div className="text-white/70 truncate pr-2" title={description}>
        {description}
      </div>
      <div className="text-white/50 text-right">
        {qtyDisplay}
      </div>
      <div className="text-white/50 text-right">
        {unitCostDisplay}
      </div>
      <div className="text-white/80 font-medium text-right">
        {formatCurrency(total)}
      </div>
    </div>
  );
});

CompactLineItem.displayName = 'CompactLineItem';

// Group line items by category
type LineItemGroup = 'materials' | 'labor' | 'markups';

function groupLineItems(items: EstimateLineItem[]): Record<LineItemGroup, EstimateLineItem[]> {
  const groups: Record<LineItemGroup, EstimateLineItem[]> = {
    materials: [],
    labor: [],
    markups: [],
  };

  items.forEach(item => {
    if (item.category === 'materials') {
      groups.materials.push(item);
    } else if (item.category === 'labor') {
      groups.labor.push(item);
    } else if (['overhead', 'profit', 'tax'].includes(item.category)) {
      groups.markups.push(item);
    }
  });

  // Sort each group by total cost (descending)
  Object.keys(groups).forEach(key => {
    groups[key as LineItemGroup].sort((a, b) => b.total - a.total);
  });

  return groups;
}

export default function EstimatePanel({ measurements, isOpen, onClose }: EstimatePanelProps) {
  const [settings, setSettings] = useState<EstimateSettings>(defaultEstimateSettings);
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<LineItemGroup>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnContentRef = useRef<HTMLDivElement>(null);
  const parentContainerRef = useRef<HTMLDivElement>(null);

  const toggleGroup = useCallback((group: LineItemGroup) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load settings from storage on mount
  useEffect(() => {
    const savedSettings = storage.loadEstimateSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  // Save settings to storage when they change
  useEffect(() => {
    storage.saveEstimateSettings(settings);
  }, [settings]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Reset expanded groups when modal closes
      setExpandedGroups(new Set());
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Esc key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Handle click outside - memoized to prevent recreation
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const estimate = useMemo<EstimateResult | null>(() => {
    if (measurements.length === 0) {
      return null;
    }

    try {
      const inputs = mapTakeoffToEstimateInputs(measurements, settings);
      return calculateEstimate(inputs, 3, undefined, settings); // Level 3 finish by default
    } catch (error) {
      console.error('Error calculating estimate:', error);
      return null;
    }
  }, [measurements, settings]);


  // Memoize content rendering to prevent unnecessary re-renders
  const content = useMemo(() => {
    if (!estimate) {
      return (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" strokeWidth={1.5} />
              Estimate
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
          <div 
            className="flex-1 min-h-0 overflow-y-auto p-6"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="text-center text-white/40 text-sm mt-8">
              {measurements.length === 0 ? (
                <>
                  <AlertCircle className="mx-auto h-12 w-12 mb-3 text-white/20" />
                  <p>No measurements yet.</p>
                  <p className="mt-1">Add measurements to generate an estimate.</p>
                </>
              ) : (
                <>
                  <AlertCircle className="mx-auto h-12 w-12 mb-3 text-yellow-400/60" />
                  <p>Unable to calculate estimate.</p>
                  <p className="mt-1 text-sm">Check console for errors.</p>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Sticky Header */}
        <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur-sm z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" strokeWidth={1.5} />
            Estimate
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        
        {/* Totals Bar */}
        <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-white/10 bg-white/5 flex items-center justify-center gap-6 md:gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/60">Total Area:</span>
            <span className="text-white font-medium">{formatNumber(estimate.areas.totalSF)} SF</span>
          </div>
          <div className="h-4 w-px bg-white/10"></div>
          <div className="flex items-center gap-2">
            <span className="text-white/60">Sheets:</span>
            <span className="text-white font-medium">{estimate.materials.sheets}</span>
          </div>
          <div className="h-4 w-px bg-white/10"></div>
          <div className="flex items-center gap-2">
            <span className="text-white/60">Total:</span>
            <span className="text-white font-semibold text-base">{formatCurrency(estimate.pricing.total)}</span>
          </div>
        </div>

        {/* Notes Alert */}
        {estimate.inputs.notes && (
          <div className="flex-shrink-0 mx-4 md:mx-6 mt-4 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded text-sm text-yellow-200">
            <AlertCircle className="w-4 h-4 inline mr-1.5" strokeWidth={1.5} />
            {estimate.inputs.notes}
          </div>
        )}

        {/* Two Column Layout: LEFT (Summary/Materials/Labor/Pricing) | RIGHT (Line Items) */}
        <div ref={parentContainerRef} className="flex-1 min-h-0 flex flex-col md:flex-row md:items-start gap-4 p-4 md:p-6 overflow-hidden">
          {/* LEFT COLUMN: Summary, Materials, Labor, Pricing */}
          <div ref={leftColumnRef} className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
            {/* Summary */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-lg flex-shrink-0">
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Wall Area:</span>
                  <span className="text-white/80">{formatNumber(estimate.areas.netWallSF)} SF</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Ceiling Area:</span>
                  <span className="text-white/80">{formatNumber(estimate.areas.netCeilingSF)} SF</span>
                </div>
                {estimate.inputs.openings.length > 0 && (
                  <div className="flex justify-between text-white/60 text-[10px] mt-2 pt-2 border-t border-white/5">
                    <span>Openings:</span>
                    <span className="text-white/70">{estimate.inputs.openings.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Materials */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-lg flex-shrink-0">
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" strokeWidth={1.5} />
                Materials
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Drywall Sheets:</span>
                  <span className="text-white/80">{estimate.materials.sheets}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Screws:</span>
                  <span className="text-white/80">{estimate.materials.screws.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Tape Rolls:</span>
                  <span className="text-white/80">{estimate.materials.tapeRolls}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Joint Compound:</span>
                  <span className="text-white/80">{estimate.materials.jointCompoundGallons} gal</span>
                </div>
                {estimate.materials.cornerBeadLF && estimate.materials.cornerBeadLF > 0 && (
                  <div className="flex justify-between text-white/70">
                    <span>Corner Bead:</span>
                    <span className="text-white/80">{formatNumber(estimate.materials.cornerBeadLF)} LF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Labor */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-lg flex-shrink-0">
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" strokeWidth={1.5} />
                Labor (Level {estimate.finishLevel})
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Hanging:</span>
                  <span className="text-white/80">{formatNumber(estimate.labor.hanging)} hrs</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Finishing:</span>
                  <span className="text-white/80">
                    {formatNumber(estimate.labor.finishing[`level${estimate.finishLevel}` as keyof typeof estimate.labor.finishing] as number)} hrs
                  </span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Cleanup:</span>
                  <span className="text-white/80">{formatNumber(estimate.labor.cleanup)} hrs</span>
                </div>
                <div className="flex justify-between text-white font-medium mt-2 pt-2 border-t border-white/5">
                  <span>Total:</span>
                  <span className="text-white/80">{formatNumber(estimate.labor.total)} hrs</span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-lg flex-shrink-0">
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" strokeWidth={1.5} />
                Pricing
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Materials:</span>
                  <span className="text-white/80">{formatCurrency(estimate.pricing.materialsCost)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Labor:</span>
                  <span className="text-white/80">{formatCurrency(estimate.pricing.laborCost)}</span>
                </div>
                <div className="flex justify-between text-white/70 mt-2 pt-2 border-t border-white/5">
                  <span>Subtotal:</span>
                  <span className="text-white font-medium">{formatCurrency(estimate.pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-white/50 text-[10px]">
                  <span>Overhead ({(estimate.pricing.overheadPercent * 100).toFixed(1)}%):</span>
                  <span className="text-white/60">{formatCurrency(estimate.pricing.overhead)}</span>
                </div>
                <div className="flex justify-between text-white/50 text-[10px]">
                  <span>Profit ({(estimate.pricing.profitPercent * 100).toFixed(1)}%):</span>
                  <span className="text-white/60">{formatCurrency(estimate.pricing.profit)}</span>
                </div>
                <div className="flex justify-between text-white/50 text-[10px]">
                  <span>Tax ({(estimate.pricing.taxPercent * 100).toFixed(1)}%):</span>
                  <span className="text-white/60">{formatCurrency(estimate.pricing.tax)}</span>
                </div>
                <div className="flex justify-between text-white font-semibold text-sm mt-3 pt-3 border-t border-white/10">
                  <span>Total:</span>
                  <span>{formatCurrency(estimate.pricing.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Line Items (scrollable) */}
          <div ref={rightColumnRef} className="min-w-0 bg-white/5 border border-white/10 p-4 rounded-lg flex flex-col self-start">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2 flex-shrink-0">
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              Line Items
            </h3>
            <div ref={rightColumnContentRef} className="flex flex-col overflow-y-auto"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {(() => {
                const grouped = groupLineItems(estimate.lineItems);
                const groupConfig: Array<{ key: LineItemGroup; label: string; icon: typeof Package }> = [
                  { key: 'materials', label: 'Materials', icon: Package },
                  { key: 'labor', label: 'Labor', icon: Clock },
                  { key: 'markups', label: 'Markups & Tax', icon: DollarSign },
                ];

                return groupConfig.map(({ key, label, icon: Icon }, groupIndex) => {
                  const items = grouped[key];
                  if (items.length === 0) return null;

                  const isExpanded = expandedGroups.has(key);
                  const topItems = items.slice(0, 5);
                  const remainingItems = items.slice(5);
                  const remainingTotal = remainingItems.reduce((sum, item) => sum + item.total, 0);
                  const showRemaining = remainingItems.length > 0;

                  return (
                    <div key={key} className={`flex flex-col min-h-0 w-full ${groupIndex > 0 ? 'mt-3' : ''}`}>
                      {/* Group Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                          <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>{label}</span>
                        </div>
                        {showRemaining && (
                          <button
                            onClick={() => toggleGroup(key)}
                            className="text-[10px] text-white/50 hover:text-white/70 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" strokeWidth={1.5} />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
                                Show all ({items.length})
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Column Headers */}
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 pb-1.5 border-b border-white/10 mb-1.5 text-[10px] text-white/40 uppercase tracking-wider">
                        <div>Item</div>
                        <div className="text-right">Qty</div>
                        <div className="text-right">Unit Cost</div>
                        <div className="text-right">Total</div>
                      </div>

                      {/* Items List */}
                      <div 
                        className={`flex flex-col min-h-0 ${isExpanded ? '' : 'overflow-hidden'}`}
                      >
                        {topItems.map((item, index) => (
                          <CompactLineItem
                            key={`${key}-${index}-${item.description}`}
                            description={item.description}
                            quantity={item.quantity}
                            unit={item.unit}
                            unitPrice={item.unitPrice}
                            total={item.total}
                          />
                        ))}
                        {showRemaining && (
                          <>
                            {isExpanded ? (
                              remainingItems.map((item, index) => (
                                <CompactLineItem
                                  key={`${key}-remaining-${index}-${item.description}`}
                                  description={item.description}
                                  quantity={item.quantity}
                                  unit={item.unit}
                                  unitPrice={item.unitPrice}
                                  total={item.total}
                                />
                              ))
                            ) : (
                              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center py-1.5 border-b border-white/5 text-xs">
                                <div className="text-white/50 italic">
                                  Other ({remainingItems.length} items)
                                </div>
                                <div></div>
                                <div></div>
                                <div className="text-white/70 font-medium text-right">
                                  {formatCurrency(remainingTotal)}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }, [estimate, measurements, onClose, expandedGroups, toggleGroup]);

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          willChange: 'opacity',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
      
      {/* Modal Panel - Fixed, non-scrolling shell */}
      <div
        ref={panelRef}
        className={`relative w-full h-[85vh] max-h-[85vh] bg-gradient-to-b from-black/95 via-black/90 to-black/95 rounded-xl shadow-2xl border border-white/10 flex flex-col transition-all duration-300 overflow-hidden ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ 
          width: 'min(96vw, 1400px)',
          maxWidth: '1400px',
          willChange: isOpen ? 'auto' : 'transform, opacity',
          transform: 'translateZ(0)',
          contain: 'layout style paint',
          backfaceVisibility: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>,
    document.body
  );
}
