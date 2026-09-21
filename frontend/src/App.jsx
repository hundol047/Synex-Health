import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout.jsx';

const SubscriptionPage = lazy(() => import('./health/pages/SubscriptionPage.jsx'));
const MonthlyReportPage = lazy(() => import('./health/pages/MonthlyReportPage.jsx'));
const HomePage = lazy(() => import('./health/pages/HomePage.jsx'));
const BodyMapPage = lazy(() => import('./health/pages/BodyMapPage.jsx'));
const ComparisonPage = lazy(() => import('./health/pages/ComparisonPage.jsx'));
const RoutinePage = lazy(() => import('./health/pages/RoutinePage.jsx'));
const WorkoutPage = lazy(() => import('./health/pages/WorkoutPage.jsx'));
const ProgressPage = lazy(() => import('./health/pages/ProgressPage.jsx'));
const AgentChatPage = lazy(() => import('./health/pages/AgentChatPage.jsx'));
const ProfilePage = lazy(() => import('./health/pages/ProfilePage.jsx'));
const CounselorDashboardPage = lazy(() => import('./health/pages/CounselorDashboardPage.jsx'));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<p role="status">화면을 불러오는 중입니다.</p>}><Routes>
          <Route path="/" element={<Navigate to="/health" replace />} />
          <Route path="/health/subscription" element={<SubscriptionPage />} />
          <Route path="/health/report" element={<MonthlyReportPage />} />
          <Route path="/health" element={<HomePage />} />
          <Route path="/health/body" element={<BodyMapPage />} />
          <Route path="/health/comparison" element={<ComparisonPage />} />
          <Route path="/health/routine" element={<RoutinePage />} />
          <Route path="/health/workout" element={<WorkoutPage />} />
          <Route path="/health/progress" element={<ProgressPage />} />
          <Route path="/health/agent" element={<AgentChatPage />} />
          <Route path="/health/profile" element={<ProfilePage />} />
          <Route path="/health-center" element={<CounselorDashboardPage />} />
          <Route path="*" element={<Navigate to="/health" replace />} />
        </Routes></Suspense>
      </Layout>
    </BrowserRouter>
  );
}
