import React, { useState } from 'react';
import { REGIONS_REGISTRY } from '../data/regions';
import { getRegionalObservations, getCompanyById, getSourceDocById } from '../utils/metricQueries';
import { RegionId } from '../types/metrics';
import { formatMetricValue } from '../utils/metricCalculations';
import {
  Globe2,
  MapPin,
  Building2,
  Info,
  ExternalLink,
} from 'lucide-react';

export const RegionalAnalysisPage: React.FC = () => {
  const regionsList = Object.values(REGIONS_REGISTRY);
  const [selectedRegionId, setSelectedRegionId] = useState<RegionId>('europe');

  const selectedRegion = REGIONS_REGISTRY[selectedRegionId];
  const observations = getRegionalObservations(selectedRegionId);

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <Globe2 className="w-4 h-4" /> Regional Market Distribution & Footprint
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Global OEM Regional Volume Intelligence
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          Detailed breakdown of vehicle sales and customer deliveries across key automotive territories. Preserves official regional perimeter definitions without blurring geographic borders.
        </p>
      </div>

      {/* Region Selector Pills */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Select Geographic Market
        </label>
        <div className="flex flex-wrap gap-2">
          {regionsList.map((reg) => {
            const isSelected = selectedRegionId === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegionId(reg.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{reg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Region Definition Card */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
          <Info className="w-4 h-4 text-brand-400" />
          <span>Regional Reporting Definition: {selectedRegion.name}</span>
        </div>
        <p className="text-slate-300">{selectedRegion.description}</p>
        <p className="text-slate-400 font-mono text-[11px] pt-1.5 border-t border-slate-800/80">
          <strong className="text-slate-300">Accounting / IR Scope:</strong>{' '}
          {selectedRegion.officialDefinitionNotes}
        </p>
      </div>

      {/* Regional Deliveries Table & Breakdown */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              OEM Deliveries in {selectedRegion.name} (FY2024)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reported vehicle deliveries and market segment breakdowns
            </p>
          </div>
        </div>

        {observations.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Automaker</th>
                  <th className="px-4 py-3">Original Region Label in IR</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                  <th className="px-4 py-3">Reporting Notes</th>
                  <th className="px-4 py-3">Source Citation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {observations.map((regObs) => {
                  const comp = getCompanyById(regObs.companyId);
                  const src = getSourceDocById(regObs.sourceDocId);

                  return (
                    <tr key={regObs.id} className="hover:bg-slate-850/60 transition">
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {comp?.name || regObs.companyId}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">
                        "{regObs.originalRegionLabel}"
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-brand-400 text-sm">
                        {formatMetricValue(regObs.value, regObs.unit)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {regObs.regionalDefinitionNotes || 'Consolidated regional delivery figure.'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {src ? (
                          <a
                            href={src.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-400 hover:underline flex items-center gap-1"
                          >
                            <span className="truncate max-w-[160px]">{src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          'Official Filing'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs">
            No specific OEM regional dispatches recorded for {selectedRegion.name} in this reporting series.
          </div>
        )}
      </div>

      {/* Global Regional Distribution Insights */}
      <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Regional Accounting Integrity Note
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          AutoMetrics preserves verbatim regional perimeters: For example, Volkswagen Group isolates "China (incl. HK)" including JV partners FAW-VW and SAIC-VW; BMW Group classifies "Europe" inclusive of Germany and the UK; Stellantis reports "Enlarged Europe". We do not synthesize artificial global aggregates across incompatible geographical perimeters.
        </p>
      </div>
    </div>
  );
};

