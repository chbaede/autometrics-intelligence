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
  Sun,
  Moon,
  BookOpen,
  Languages,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlossaryModal } from '../metrics/GlossaryModal';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  const navLinks = [
    { to: '/', label: t.nav.overview, icon: Activity },
    { to: '/compare', label: t.nav.comparison, icon: BarChart2 },
    { to: '/regions', label: t.nav.regional, icon: Globe2 },
    { to: '/guidance', label: t.nav.guidance, icon: Compass },
    { to: '/sources', label: t.nav.sources, icon: FileText },
    { to: '/coverage', label: t.nav.coverage, icon: TableProperties },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 dark:bg-slate-950/95 light:bg-white/95 backdrop-blur-md border-b border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Subtitle */}
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <div className="p-2 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-lg group-hover:from-brand-400 group-hover:to-brand-600 transition shadow-xs shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white dark:text-white light:text-slate-900 group-hover:text-brand-400 transition truncate">
                  AutoMetrics Intelligence
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden md:inline-block">
                  {t.nav.verifiedIr}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 light:text-slate-500 truncate hidden lg:inline">
                Global Automotive OEM Performance & Investor Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      isActive
                        ? 'bg-brand-600/20 text-brand-300 dark:text-brand-300 light:text-brand-600 border border-brand-500/30'
                        : 'text-slate-300 dark:text-slate-300 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-slate-900 dark:hover:bg-slate-900 light:hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Utility Controls (Theme Toggle, Language Toggle, Glossary Button, Main Hub) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Main Hub Link */}
            <a
              href="https://main.yocto.co.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-300 dark:text-brand-300 light:text-brand-700 bg-brand-950/60 dark:bg-brand-950/60 light:bg-brand-50 hover:bg-brand-900/60 dark:hover:bg-brand-900/60 light:hover:bg-brand-100 border border-brand-800/60 dark:border-brand-800/60 light:border-brand-200 transition shadow-xs"
              title={t.nav.mainHubDesc}
            >
              <span>{t.nav.mainHub}</span>
              <ExternalLink className="w-3 h-3 text-brand-400" />
            </a>

            {/* Glossary Button */}
            <button
              onClick={() => setIsGlossaryOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 bg-slate-900 dark:bg-slate-900 light:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-800 dark:border-slate-800 light:border-slate-300 transition"
              title={language === 'ko' ? '용어 및 약어 사전 열기' : 'Open Glossary'}
            >
              <BookOpen className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">{language === 'ko' ? '용어 약자 풀이' : 'Acronyms'}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 bg-slate-900 dark:bg-slate-900 light:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-800 dark:border-slate-800 light:border-slate-300 transition"
              title={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
            >
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Theme Switcher (Night / Normal) */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 bg-slate-900 dark:bg-slate-900 light:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-800 dark:border-slate-800 light:border-slate-300 transition flex items-center gap-1"
              title={theme === 'dark' ? 'Switch to Normal Light Mode' : 'Switch to Night Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline font-sans text-[11px]">Normal</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-brand-400" />
                  <span className="hidden md:inline font-sans text-[11px]">Night</span>
                </>
              )}
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 dark:hover:bg-slate-900 light:hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden px-4 pt-2 pb-4 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-950/98 dark:bg-slate-950/98 light:bg-white space-y-1">
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
                        ? 'bg-brand-600/20 text-brand-300 dark:text-brand-300 light:text-brand-600 border border-brand-500/30'
                        : 'text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-900 dark:hover:bg-slate-900 light:hover:bg-slate-100'
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

      {/* Glossary Modal */}
      <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
    </>
  );
};
