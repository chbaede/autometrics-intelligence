import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { GlobalOverviewPage } from './pages/GlobalOverviewPage';
import { CompanyDashboardPage } from './pages/CompanyDashboardPage';
import { CompanyComparisonPage } from './pages/CompanyComparisonPage';
import { RegionalAnalysisPage } from './pages/RegionalAnalysisPage';
import { GuidanceOutlookPage } from './pages/GuidanceOutlookPage';
import { DataCoveragePage } from './pages/DataCoveragePage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter basename="/autometrics-intelligence">
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
