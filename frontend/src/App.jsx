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

const GoalsPage = lazy(() => import('./health/pages/GoalsPage.jsx'));

const PrivacyPage = lazy(() => import('./health/pages/PrivacyPage.jsx'));

const ExerciseLibraryPage = lazy(() => import('./health/pages/ExerciseLibraryPage.jsx'));

const PoseCoachPage = lazy(() => import('./health/pages/PoseCoachPage.jsx'));

const AdminPage = lazy(() => import('./health/pages/AdminPage.jsx'));

const ConnectionsPage = lazy(() => import('./health/pages/ConnectionsPage.jsx'));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<p role="status">화면을 불러오는 중입니다.</p>}><Routes>
          <Route path="/" element={<Navigate to="/health" replace />} />
          <Route path="/health/subscription" element={<SubscriptionPage />} />
          <Route path="/health/report" element={<MonthlyReportPage />} />
          <Route path="/health/goals" element={<GoalsPage />} />
          <Route path="/health/privacy" element={<PrivacyPage />} />
          <Route path="/health/library" element={<ExerciseLibraryPage />} />
          <Route path="/health/pose" element={<PoseCoachPage />} />
          <Route path="/health/admin" element={<AdminPage />} />
          <Route path="/health/connections" element={<ConnectionsPage />} />
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
