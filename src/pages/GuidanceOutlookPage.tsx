import React, { useState } from 'react';
import { getAllGuidance, getCompanyById, getSourceDocById, getObservations } from '../utils/metricQueries';
import { GuidanceRangeChart } from '../components/metrics/charts/GuidanceRangeChart';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Compass,
  AlertTriangle,
  ExternalLink,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Target,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const GuidanceOutlookPage: React.FC = () => {
  const { language } = useLanguage();
  const guidanceList = getAllGuidance();

  const [activeCategory, setActiveCategory] = useState<'all' | 'margin' | 'volume'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  const toggleHistory = (id: string) => {
    setExpandedHistoryIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered list
  const filteredList = guidanceList.filter((g) => {
    if (activeCategory === 'margin' && g.unit !== 'percentage' && g.metricId !== 'guidance_operating_margin') {
      return false;
    }
    if (activeCategory === 'volume' && g.metricId !== 'guidance_deliveries_global' && g.unit === 'percentage') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const comp = getCompanyById(g.companyId);
      const matchComp = comp?.name.toLowerCase().includes(q) || comp?.shortName?.toLowerCase().includes(q) || g.companyId.includes(q);
      const matchText = g.originalText.toLowerCase().includes(q) || (g.translationKo && g.translationKo.toLowerCase().includes(q));
      if (!matchComp && !matchText) return false;
    }
    return true;
  });

  // Calculate high-level KPIs across all guidance records
  const raisedCount = guidanceList.filter((g) => g.status === 'raised').length;
  const loweredCount = guidanceList.filter((g) => g.status === 'lowered').length;
  const reaffirmedCount = guidanceList.filter((g) => g.status === 'reaffirmed' || g.status === 'initial').length;

  // Actual Q3 2026 performance observations lookup helper
  const getActualQ3Result = (companyId: string, unit: string) => {
    const actualMetricId = unit === 'percentage' ? 'operating_margin' : 'deliveries_global';
    const obs = getObservations([companyId], [actualMetricId], '2026-Q3');
    if (obs && obs.length > 0) {
      return obs[0];
    }
    return null;
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'raised':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
            <TrendingUp className="w-3 h-3" /> {language === 'ko' ? '목표 상향 (Raised)' : 'Raised'}
          </span>
        );
      case 'lowered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold shrink-0">
            <TrendingDown className="w-3 h-3" /> {language === 'ko' ? '목표 하향 (Lowered)' : 'Lowered'}
          </span>
        );
      case 'reaffirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold shrink-0">
            <CheckCircle2 className="w-3 h-3" /> {language === 'ko' ? '목표 재확인 (Reaffirmed)' : 'Reaffirmed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold shrink-0">
            <Target className="w-3 h-3" /> {language === 'ko' ? '초기 공시 (Initial)' : 'Initial'}
          </span>
        );
    }
  };

  // Format corridor display
  const formatCorridor = (min?: number, max?: number, target?: number, unit?: string) => {
    const isPct = unit === 'percentage';
    if (min !== undefined && max !== undefined) {
      if (min === max) {
        return isPct ? `${min}%` : `${min.toLocaleString()}k`;
      }
      return isPct ? `${min}% ~ ${max}%` : `${min.toLocaleString()} ~ ${max.toLocaleString()}k`;
    }
    if (target !== undefined) {
      return isPct ? `${target}%` : `${target.toLocaleString()}k`;
    }
    return '-';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
            <Compass className="w-4 h-4" /> {language === 'ko' ? '2026-Q3 공시 기반 경영진 공식 가이던스' : '2026-Q3 Forward-Looking Management Guidance'}
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'ko' ? '공식 IR 1차 출처 검증 완료' : 'Verified Against Primary IR Releases'}</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '완성차 OEM 연간 재무 가이던스 & 예측 궤적 분석' : 'OEM Financial Guidance & Forecast Revision Track Record'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-4xl leading-relaxed">
          {language === 'ko'
            ? '2026년 3분기(Q3) 최신 실적발표회 및 연간 사업보고서에서 공시된 경영진의 공식 가이던스입니다. 연초 초기 목표, Q2 상반기 점검, Q3 최신 전망의 변동 이력을 완전 보관하여 예측 정확도 및 목표 달성 추세를 비교 분석합니다.'
            : 'Official management projections updated for 2026-Q3 earnings calls and financial reports. Preserves multi-stage revision history (Initial FY outlook, Q2 mid-year review, and Latest Q3 disclosures) to evaluate forecast accuracy against actual performance.'}
        </p>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              {language === 'ko' ? '추적 가이던스 항목' : 'Tracked Guidance'}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {guidanceList.length}
              </span>
              <span className="text-xs text-slate-500">{language === 'ko' ? '개 지표' : 'items'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block">
              {language === 'ko' ? '목표 상향 (Raised)' : 'Raised Targets'}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {raisedCount}
              </span>
              <span className="text-xs text-emerald-600/80">{language === 'ko' ? '건 (GM·지리 등)' : 'items (GM, Geely)'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
            <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 block">
              {language === 'ko' ? '목표 하향 (Lowered)' : 'Lowered Targets'}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {loweredCount}
              </span>
              <span className="text-xs text-rose-600/80">{language === 'ko' ? '건 (VW·BMW·벤츠)' : 'items (VW, BMW, MBG)'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400 block">
              {language === 'ko' ? '목표 유지 (Reaffirmed)' : 'Reaffirmed Targets'}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {reaffirmedCount}
              </span>
              <span className="text-xs text-blue-600/80">{language === 'ko' ? '건 (현대·기아·도요타)' : 'items (HMC, Kia)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forward-Looking Disclaimer Notice */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900 dark:text-slate-200 block mb-0.5">
            {language === 'ko' ? '미래 예측 진술(Forward-Looking Statement) 면책 및 변동 공시 원칙' : 'Forward-Looking Information Safe Harbor & Revision Integrity'}
          </strong>
          <span>
            {language === 'ko'
              ? '가이던스는 각사 경영진의 공식 발표 수치이며, AutoMetrics는 독자적 추정치를 개입하지 않고 공식 IR 발표 원문 그대로를 수록합니다. 과거 연초 및 Q2 예측치와 최신 Q3 발표치를 함께 보관하여 경영진의 가이던스 신뢰도와 환경 대응력을 투명하게 비교할 수 있도록 지원합니다.'
              : 'Guidance targets represent executive management projections subject to substantial macroeconomic and market uncertainties. AutoMetrics logs exact verbatim disclosures without subjective alterations and archives all historical revisions for transparent auditability.'}
          </span>
        </div>
      </div>

      {/* Guidance Corridors Range Visualizer */}
      <GuidanceRangeChart guidanceList={guidanceList} />

      {/* SECTION: Guidance Revision History & Track Record Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              {language === 'ko'
                ? '가이던스 변동 궤적 및 2026-Q3 실적 대비 예측 정확도'
                : 'Guidance Revision Trajectory & Forecast Accuracy vs 2026-Q3 Actuals'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ko'
                ? '연초 공시 → 2분기 점검 → 3분기 최신 공시로 이어진 가이던스 변화와 실제 2026-Q3 실적의 달성도를 비교합니다.'
                : 'Side-by-side comparison of Initial Outlook, Q2 Review, Latest Q3 Target, and Actual 2026-Q3 Performance.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {language === 'ko' ? '시계열 3단계 추적' : '3-Stage History'}
            </span>
          </div>
        </div>

        {/* Comparative Track Record Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3.5">{language === 'ko' ? '완성차 제조사' : 'Automaker'}</th>
                <th className="py-3 px-3">{language === 'ko' ? '목표 지표' : 'Metric'}</th>
                <th className="py-3 px-3 text-center bg-slate-100/60 dark:bg-slate-900/60 font-mono">
                  {language === 'ko' ? '연초 목표 (Initial)' : 'Initial FY'}
                </th>
                <th className="py-3 px-3 text-center bg-slate-100/60 dark:bg-slate-900/60 font-mono">
                  {language === 'ko' ? 'Q2 점검 (Revision)' : 'Q2 Review'}
                </th>
                <th className="py-3 px-3 text-center bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300 font-mono font-bold">
                  {language === 'ko' ? 'Q3 최신 (Latest)' : 'Latest Q3'}
                </th>
                <th className="py-3 px-3 text-center font-mono">
                  {language === 'ko' ? '2026-Q3 실제실적' : 'Actual Q3'}
                </th>
                <th className="py-3 px-3 text-center">{language === 'ko' ? '예측 달성 추세' : 'Tracking Status'}</th>
                <th className="py-3 px-3 min-w-[200px]">{language === 'ko' ? '핵심 변동 사유 및 경영진 분석' : 'Key Drivers & Rationale'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 font-sans">
              {guidanceList.map((g) => {
                const comp = getCompanyById(g.companyId);
                const actualObs = getActualQ3Result(g.companyId, g.unit);
                const history = g.revisionHistory || [];
                const initRev = history.find((r) => r.stage === 'initial');
                const q2Rev = history.find((r) => r.stage === 'q2');

                const isMargin = g.unit === 'percentage' || g.metricId === 'guidance_operating_margin';

                // Evaluate tracking status badge
                let statusBadgeText = language === 'ko' ? '순항 유지' : 'On Track';
                let statusBadgeStyle = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';

                if (g.status === 'raised') {
                  statusBadgeText = language === 'ko' ? '초과 달성 / 상향' : 'Outperforming / Raised';
                  statusBadgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                } else if (g.status === 'lowered') {
                  statusBadgeText = language === 'ko' ? '목표 하향 / 감익' : 'Guidance Cut / Pressure';
                  statusBadgeStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                } else if (g.status === 'reaffirmed') {
                  statusBadgeText = language === 'ko' ? '견조한 목표 유지' : 'Solid / Reaffirmed';
                  statusBadgeStyle = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                }

                // Summary rationale from latest revision or root
                const latestRev = history.find((r) => r.stage === 'q3') || history[history.length - 1];
                const rationaleText = language === 'ko'
                  ? (latestRev?.rationaleKo || g.riskNotesKo || '경영진 실적 가이던스 유지')
                  : (latestRev?.rationale || g.riskNotes || 'Target reaffirmed by management');

                return (
                  <tr
                    key={g.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* OEM Name */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {comp?.shortName || g.companyId}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{comp?.hqCountry}</div>
                    </td>

                    {/* Metric Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {isMargin
                          ? (language === 'ko' ? '영업이익률' : 'Operating RoS')
                          : (language === 'ko' ? '글로벌 판매량' : 'Deliveries')}
                      </span>
                    </td>

                    {/* Initial FY Target */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {initRev ? formatCorridor(initRev.min, initRev.max, initRev.target, g.unit) : formatCorridor(g.min, g.max, g.target, g.unit)}
                    </td>

                    {/* Q2 Review Target */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {q2Rev ? (
                        <span className={q2Rev.status === 'lowered' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                          {formatCorridor(q2Rev.min, q2Rev.max, q2Rev.target, g.unit)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Q3 Latest Target */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-brand-700 dark:text-brand-300 bg-brand-50/30 dark:bg-brand-950/10 whitespace-nowrap">
                      {formatCorridor(g.min, g.max, g.target, g.unit)}
                    </td>

                    {/* Actual 2026-Q3 Result */}
                    <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                      {actualObs && actualObs.value != null ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border border-slate-200 dark:border-slate-700">
                          {isMargin ? `${actualObs.value}%` : `${actualObs.value.toLocaleString()}k`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Tracking Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeStyle}`}>
                        {statusBadgeText}
                      </span>
                    </td>

                    {/* Drivers & Rationale */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                      {rationaleText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Guidance Records & Interactive History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              {language === 'ko' ? '경영진 공식 공시 원문 및 변동 이력 타임라인' : 'Official Management Statements & Full Revision Timelines'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ko'
                ? '공시 원문 전문, 주요 가정 및 위험 요인, 각 분기별 변동 사유 및 1차 IR 출처 문서'
                : 'Verbatim quotes, key assumptions, risk factors, multi-stage revision logs, and source documents'}
            </p>
          </div>

          {/* Category Tabs & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'ko' ? '제조사 또는 키워드 검색...' : 'Filter by OEM or quote...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500 w-48 sm:w-56"
              />
            </div>

            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeCategory === 'all'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? '전체' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('margin')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeCategory === 'margin'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? '영업이익률' : 'Operating RoS'}
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('volume')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeCategory === 'volume'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? '판매량' : 'Deliveries'}
              </button>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="space-y-4 pt-1">
          {filteredList.map((g) => {
            const comp = getCompanyById(g.companyId);
            const src = getSourceDocById(g.sourceDocId);
            const isHistoryExpanded = !!expandedHistoryIds[g.id];
            const revisions = g.revisionHistory || [];

            return (
              <div
                key={g.id}
                className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{comp?.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-semibold">
                      {language === 'ko' ? `${g.reportingYear}년 연간 목표 전망` : `${g.reportingYear} Annual Outlook`}
                    </span>
                    {renderStatusBadge(g.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Published: {g.publicationDate}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/40 font-bold shadow-2xs">
                      {g.unit === 'percentage'
                        ? `Target: ${formatCorridor(g.min, g.max, g.target, g.unit)}`
                        : `Target: ${formatCorridor(g.min, g.max, g.target, g.unit)}`}
                    </span>
                  </div>
                </div>

                {/* Quoted Statement */}
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 italic font-mono space-y-1.5">
                  <div className="text-[12.5px] font-sans font-medium not-italic text-slate-900 dark:text-slate-100">
                    "{language === 'ko' && g.translationKo ? g.translationKo : g.originalText}"
                  </div>
                  {language === 'ko' && g.translationKo && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 not-italic font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
                      EN Verbatim: "{g.originalText}"
                    </div>
                  )}
                </div>

                {/* Assumptions and Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  {((language === 'ko' && g.assumptionsKo) ? g.assumptionsKo : g.assumptions) && (
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        {language === 'ko' ? '경영진 핵심 전제조건' : 'Management Assumptions'}
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                        {((language === 'ko' && g.assumptionsKo) ? g.assumptionsKo : g.assumptions)!.map((ass, i) => (
                          <li key={i}>{ass}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {((language === 'ko' && g.riskNotesKo) ? g.riskNotesKo : g.riskNotes) && (
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        {language === 'ko' ? '주요 위험 요인 및 조정 사유' : 'Key Risk Factors & Drivers'}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {(language === 'ko' && g.riskNotesKo) ? g.riskNotesKo : g.riskNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Collapsible Revision History Timeline */}
                {revisions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleHistory(g.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors py-1"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>
                        {language === 'ko'
                          ? `가이던스 변동 히스토리 타임라인 (${revisions.length}단계 기록)`
                          : `Guidance Revision Timeline (${revisions.length} Stages Recorded)`}
                      </span>
                      {isHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isHistoryExpanded && (
                      <div className="mt-3 space-y-2.5 pl-2 sm:pl-4 border-l-2 border-brand-500/40 animate-in fade-in duration-200">
                        {revisions.map((rev, revIdx) => {
                          const revSrc = getSourceDocById(rev.sourceDocId);
                          const stageTitle = language === 'ko'
                            ? (rev.stageLabelKo || rev.stage)
                            : (rev.stageLabel || rev.stage);

                          return (
                            <div
                              key={revIdx}
                              className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 uppercase font-mono">
                                    {stageTitle}
                                  </span>
                                  <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                                    {rev.date}
                                  </span>
                                  {renderStatusBadge(rev.status)}
                                </div>
                                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {formatCorridor(rev.min, rev.max, rev.target, g.unit)}
                                </div>
                              </div>

                              {/* Revision Quote */}
                              <p className="text-slate-700 dark:text-slate-300 italic text-[11.5px] font-mono">
                                "{language === 'ko' && rev.textKo ? rev.textKo : rev.text}"
                              </p>

                              {/* Rationale & Source Link */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                                {(rev.rationaleKo || rev.rationale) && (
                                  <div className="text-slate-600 dark:text-slate-400">
                                    <strong className="font-medium text-slate-700 dark:text-slate-300">
                                      {language === 'ko' ? '조정 사유: ' : 'Rationale: '}
                                    </strong>
                                    {language === 'ko' && rev.rationaleKo ? rev.rationaleKo : rev.rationale}
                                  </div>
                                )}
                                {revSrc && (
                                  <a
                                    href={revSrc.officialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 font-medium shrink-0 ml-auto"
                                  >
                                    <span>{language === 'ko' ? '공시 원문' : 'Release Link'}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Official Source Document Link */}
                {src && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-md">Source: {src.title}</span>
                    <a
                      href={src.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0 font-medium"
                    >
                      <span>{language === 'ko' ? '공식 1차 IR 공시 자료 보기' : 'View Official Release'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
