import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800/80 pt-10 pb-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-600 text-white rounded-md">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-100 text-sm">AutoMetrics Intelligence</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Source-backed quantitative intelligence dashboard for global automotive OEMs (VW, Toyota, Tesla, BYD, BMW, Mercedes, Stellantis, Hyundai, Ford, GM). Built exclusively on verified investor relations disclosures, SEC filings, and quarterly earnings presentations.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Zero fabricated data • Exact accounting labels preserved • Direct source audit trail</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-semibold text-xs uppercase tracking-wider">
              Intelligence Modules
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/" className="hover:text-brand-400 transition">
                  Global Overview
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-brand-400 transition">
                  OEM Comparison Engine
                </Link>
              </li>
              <li>
                <Link to="/regions" className="hover:text-brand-400 transition">
                  Regional Performance
                </Link>
              </li>
              <li>
                <Link to="/guidance" className="hover:text-brand-400 transition">
                  Management Guidance & Outlook
                </Link>
              </li>
              <li>
                <Link to="/sources" className="hover:text-brand-400 transition">
                  IR Source Library
                </Link>
              </li>
            </ul>
          </div>

          {/* Regulatory & Disclaimer */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-semibold text-xs uppercase tracking-wider">
              Legal & Methodology
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              This intelligence tool is provided for professional research, engineering, and comparative analysis. It does not constitute investment advice. All financial figures represent primary official disclosures of their respective corporations.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} AutoMetrics Intelligence • Global Automotive OEM Performance
          </div>
          <div className="flex items-center gap-4">
            <Link to="/sources" className="hover:text-slate-300 transition">
              Verified Sources (100%)
            </Link>
            <span>•</span>
            <Link to="/coverage" className="hover:text-slate-300 transition">
              Data Freshness: Q1 2025
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

