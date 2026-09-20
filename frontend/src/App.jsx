import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout.jsx';

import HomePage from './health/pages/HomePage.jsx';
import BodyMapPage from './health/pages/BodyMapPage.jsx';
import ComparisonPage from './health/pages/ComparisonPage.jsx';
import RoutinePage from './health/pages/RoutinePage.jsx';
import WorkoutPage from './health/pages/WorkoutPage.jsx';
import ProgressPage from './health/pages/ProgressPage.jsx';
import AgentChatPage from './health/pages/AgentChatPage.jsx';
import ProfilePage from './health/pages/ProfilePage.jsx';
import CounselorDashboardPage from './health/pages/CounselorDashboardPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/health" replace />} />
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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
