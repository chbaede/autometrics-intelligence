import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Code-split route pages to optimize mobile initial bundle size
const GlobalOverviewPage = lazy(() =>
  import('./pages/GlobalOverviewPage').then((m) => ({ default: m.GlobalOverviewPage }))
);
const CompanyDashboardPage = lazy(() =>
  import('./pages/CompanyDashboardPage').then((m) => ({ default: m.CompanyDashboardPage }))
);
const CompanyComparisonPage = lazy(() =>
  import('./pages/CompanyComparisonPage').then((m) => ({ default: m.CompanyComparisonPage }))
);
const RegionalAnalysisPage = lazy(() =>
  import('./pages/RegionalAnalysisPage').then((m) => ({ default: m.RegionalAnalysisPage }))
);
const GuidanceOutlookPage = lazy(() =>
  import('./pages/GuidanceOutlookPage').then((m) => ({ default: m.GuidanceOutlookPage }))
);
const DataCoveragePage = lazy(() =>
  import('./pages/DataCoveragePage').then((m) => ({ default: m.DataCoveragePage }))
);

const PageLoadingFallback: React.FC = () => (
  <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    <span className="text-xs font-mono text-slate-400">Loading module...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<GlobalOverviewPage />} />
                  <Route path="/overview" element={<Navigate to="/" replace />} />
                  <Route path="/automotive" element={<Navigate to="/" replace />} />
                  <Route path="/company/:companyId" element={<CompanyDashboardPage />} />
                  <Route path="/compare" element={<CompanyComparisonPage />} />
                  <Route path="/regions" element={<RegionalAnalysisPage />} />
                  <Route path="/guidance" element={<GuidanceOutlookPage />} />
                  <Route path="/sources" element={<Navigate to="/coverage" replace />} />
                  <Route path="/coverage" element={<DataCoveragePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
