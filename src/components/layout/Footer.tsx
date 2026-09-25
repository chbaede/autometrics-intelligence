import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, ExternalLink, Network } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const Footer: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 pt-10 pb-8 text-xs text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-600 text-white rounded-md shadow-xs">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">AutoMetrics Intelligence</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-md">
              {language === 'ko'
                ? '글로벌 10대 완성차 OEM(VW, Toyota, Tesla, BYD, BMW, Mercedes, Stellantis, Hyundai, Ford, GM)의 공식 IR 실적 및 공시 데이터를 실시간 비교/분석하는 전문 금융 및 엔지니어링 인텔리전스 플랫폼입니다.'
                : 'Source-backed quantitative intelligence dashboard for global automotive OEMs (VW, Toyota, Tesla, BYD, BMW, Mercedes, Stellantis, Hyundai, Ford, GM). Built exclusively on verified investor relations disclosures, SEC filings, and quarterly earnings presentations.'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-brand-500 dark:text-brand-400" />
              <span>
                {language === 'ko'
                  ? '100% 공식 IR 공시 데이터 • 임의 추정치 배제 • 산식 및 출처 직결'
                  : 'Zero fabricated data • Exact accounting labels preserved • Direct source audit trail'}
              </span>
            </div>

            {/* Main Hub Banner */}
            <div className="pt-2">
              <a
                href="https://main.yocto.co.kr/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 transition group shadow-xs"
              >
                <Network className="w-4 h-4 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition" />
                <span className="font-medium text-xs">
                  {language === 'ko' ? 'Yocto 메인 허브 바로가기' : 'Go to Yocto Main Hub'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 transition" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="text-slate-900 dark:text-slate-200 font-semibold text-xs uppercase tracking-wider">
              {language === 'ko' ? '인텔리전스 모듈' : 'Intelligence Modules'}
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
                  {t.nav.overview}
                </Link>
              </li>
              <li>
                <Link to="/compare" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
                  {t.nav.comparison}
                </Link>
              </li>
              <li>
                <Link to="/regions" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
                  {t.nav.regional}
                </Link>
              </li>
              <li>
                <Link to="/guidance" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
                  {t.nav.guidance}
                </Link>
              </li>
              <li>
                <Link to="/coverage" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
                  {t.nav.coverage}
                </Link>
              </li>
            </ul>
          </div>

          {/* Regulatory & Disclaimer */}
          <div className="space-y-2.5">
            <h4 className="text-slate-900 dark:text-slate-200 font-semibold text-xs uppercase tracking-wider">
              {language === 'ko' ? '규정 및 데이터 고지' : 'Legal & Methodology'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              {language === 'ko'
                ? '본 대시보드는 글로벌 완성차 산업 분석 및 엔지니어링 리서치를 위한 인텔리전스 도구이며 투자 자문을 구성하지 않습니다. 모든 수치는 각 기업의 공식 IR 공시 기준입니다.'
                : 'This intelligence tool is provided for professional research, engineering, and comparative analysis. It does not constitute investment advice. All financial figures represent primary official disclosures of their respective corporations.'}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <div>
            © {new Date().getFullYear()} AutoMetrics Intelligence • Global Automotive OEM Performance
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://main.yocto.co.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition flex items-center gap-1"
            >
              <span>main.yocto.co.kr</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <Link to="/coverage" className="hover:text-slate-800 dark:hover:text-slate-300 transition">
              {language === 'ko' ? '데이터 수집 및 IR 출처 (100%)' : 'Data Coverage & Verified IR (100%)'}
            </Link>
            <span>•</span>
            <Link to="/coverage" className="hover:text-slate-800 dark:hover:text-slate-300 transition">
              {language === 'ko' ? '데이터 기준: 2026.Q2 (최신 업데이트)' : 'Data Freshness: Q2 2026 (Updated Sep 2026)'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
