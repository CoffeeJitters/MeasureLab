'use client';

import { useMemo } from 'react';
import { Measurement } from '@/types';
import { mapTakeoffToEstimateInputs } from '@/lib/estimate/fromTakeoff';
import { calculateEstimate } from '@/lib/estimate/calc';
import { EstimateResult } from '@/lib/estimate/types';
import { DollarSign, Package, Clock, FileText, AlertCircle } from 'lucide-react';

interface EstimatePanelProps {
  measurements: Measurement[];
}

export default function EstimatePanel({ measurements }: EstimatePanelProps) {
  const estimate = useMemo<EstimateResult | null>(() => {
    if (measurements.length === 0) {
      return null;
    }

    try {
      const inputs = mapTakeoffToEstimateInputs(measurements);
      return calculateEstimate(inputs, 3); // Level 3 finish by default
    } catch (error) {
      console.error('Error calculating estimate:', error);
      return null;
    }
  }, [measurements]);

  if (!estimate) {
      return (
        <div className="w-80 bg-gradient-to-b from-black/90 via-black/85 to-black/90 border-l border-white/5 flex flex-col h-screen">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-medium text-white/80 flex items-center gap-2">
              <DollarSign className="w-4 h-4" strokeWidth={1.5} />
              Estimate
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center text-white/40 text-xs mt-8">
            {measurements.length === 0 ? (
              <>
                <AlertCircle className="mx-auto h-8 w-8 mb-2 text-white/20" />
                <p>No measurements yet.</p>
                <p className="mt-1">Add measurements to generate an estimate.</p>
              </>
            ) : (
              <>
                <AlertCircle className="mx-auto h-8 w-8 mb-2 text-yellow-400/60" />
                <p>Unable to calculate estimate.</p>
                <p className="mt-1 text-xs">Check console for errors.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="w-80 bg-gradient-to-b from-black/90 via-black/85 to-black/90 border-l border-white/5 flex flex-col h-screen">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <DollarSign className="w-4 h-4" strokeWidth={1.5} />
          Estimate
        </h2>
        {estimate.inputs.notes && (
          <div className="mt-2 px-2 py-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded text-xs text-yellow-200">
            <AlertCircle className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
            {estimate.inputs.notes}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Summary */}
        <div className="bg-white/5 border border-white/5 p-3 rounded">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">Summary</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-white/70">
              <span>Wall Area:</span>
              <span className="text-white/80">{formatNumber(estimate.areas.netWallSF)} SF</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Ceiling Area:</span>
              <span className="text-white/80">{formatNumber(estimate.areas.netCeilingSF)} SF</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Total Area:</span>
              <span className="text-white font-medium">{formatNumber(estimate.areas.totalSF)} SF</span>
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
        <div className="bg-white/3 border border-white/5 p-3 rounded">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" strokeWidth={1.5} />
            Materials
          </h3>
          <div className="space-y-1 text-xs">
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
        <div className="bg-white/5 border border-white/5 p-3 rounded">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            Labor (Level {estimate.finishLevel})
          </h3>
          <div className="space-y-1 text-xs">
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
        <div className="bg-white/5 border border-white/5 p-3 rounded">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} />
            Pricing
          </h3>
          <div className="space-y-1 text-xs">
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

        {/* Line Items */}
        <div className="bg-white/5 border border-white/5 p-3 rounded">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
            Line Items
          </h3>
          <div className="space-y-1.5 text-[10px]">
            {estimate.lineItems.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-start pb-1.5 border-b border-white/5 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white/70">{item.description}</div>
                  <div className="text-white/40">
                    {item.quantity} {item.unit}
                    {item.unitPrice > 0 && ` × ${formatCurrency(item.unitPrice)}`}
                  </div>
                </div>
                <div className="text-white/80 font-medium ml-2 text-xs">
                  {formatCurrency(item.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
