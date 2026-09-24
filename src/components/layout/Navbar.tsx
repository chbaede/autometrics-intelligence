import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  Globe2,
  Compass,
  FileText,
  TableProperties,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Overview', icon: Activity },
    { to: '/compare', label: 'OEM Comparison', icon: BarChart2 },
    { to: '/regions', label: 'Regional Analysis', icon: Globe2 },
    { to: '/guidance', label: 'Guidance & Outlook', icon: Compass },
    { to: '/sources', label: 'Source Explorer', icon: FileText },
    { to: '/coverage', label: 'Coverage Matrix', icon: TableProperties },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Subtitle */}
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          <div className="p-2 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-lg group-hover:from-brand-400 group-hover:to-brand-600 transition shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-brand-400 transition truncate">
                AutoMetrics Intelligence
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
                Verified IR Data
              </span>
            </div>
            <span className="text-[11px] text-slate-400 truncate hidden md:inline">
              Global Automotive OEM Performance & Investor Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Utility Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            <span>10 Global OEMs Active</span>
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-t border-slate-800 bg-slate-950/95 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
};

