import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  Globe2,
  Compass,
  TableProperties,
  Menu,
  X,
  Sun,
  Moon,
  Languages,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: t.nav.overview, icon: Activity },
    { to: '/compare', label: t.nav.comparison, icon: BarChart2 },
    { to: '/regions', label: t.nav.regional, icon: Globe2 },
    { to: '/guidance', label: t.nav.guidance, icon: Compass },
    { to: '/coverage', label: t.nav.coverage, icon: TableProperties },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Logo & Live Update Indicator */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0 py-1">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-blue-500 text-white flex items-center justify-center shadow-sm shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-extrabold text-[15px] tracking-tight text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                AutoMetrics
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono tracking-wide">
                Intelligence
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="font-mono font-medium tracking-tight">
                {language === 'ko' ? '2026.11.01 최신 업데이트' : 'Updated Nov 1, 2026'}
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs border border-slate-200/70 dark:border-slate-700/70 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Main Hub External Link */}
          <a
            href="https://main.yocto.co.kr/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 h-8.5 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 transition"
            title={t.nav.mainHubDesc}
          >
            <span className="whitespace-nowrap">{t.nav.mainHub}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <div className="hidden sm:block h-3.5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 h-8.5 px-2.5 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800/70 transition"
            title={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
            aria-label="Toggle language"
          >
            <Languages className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="w-8.5 h-8.5 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800/70 transition flex items-center justify-center"
            title={theme === 'dark' ? '라이트 모드로 전환 (Light Mode)' : '다크 모드로 전환 (Dark Mode)'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-brand-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8.5 h-8.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center ml-0.5"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 space-y-1.5 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/30 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}

          {/* Main Hub External Link in Mobile Drawer */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <a
              href="https://main.yocto.co.kr/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition border border-dashed border-slate-300 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{t.nav.mainHub}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                main.yocto.co.kr
              </span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
