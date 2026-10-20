import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/main-layout';
import { CoordinatorDesktopMatrixPage } from '../pages/coordinator/coordinator-desktop-matrix.page';
import { CoordinatorAssignmentsPage } from '../pages/coordinator/coordinator-assignments.page';
import { TeacherOnboardingPage } from '../pages/teacher/teacher-onboarding.page';
import { TeacherLockedPage } from '../pages/teacher/teacher-locked.page';
import { TeacherMakerPage } from '../pages/teacher/teacher-maker.page';
import { CoordinatorIncidencesPage } from '../pages/coordinator/coordinator-incidences.page';
import { PublicScheduleViewerPage } from '../pages/public/public-schedule-viewer.page';

import { CoordinatorMatrixProvider } from '../context/CoordinatorMatrixContext';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <CoordinatorMatrixProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/coordinator/matrix" replace />} />
            <Route path="coordinator/matrix" element={<CoordinatorDesktopMatrixPage />} />
            <Route path="coordinator/assignments" element={<CoordinatorAssignmentsPage />} />
            <Route path="coordinator/novedades" element={<CoordinatorIncidencesPage />} />
            <Route path="register/teacher" element={<TeacherOnboardingPage />} />
            <Route path="teacher/locked" element={<TeacherLockedPage />} />
            <Route path="teacher/absences" element={<CoordinatorIncidencesPage />} />
            <Route path="public/schedule" element={<PublicScheduleViewerPage />} />
            <Route path="*" element={<Navigate to="/coordinator/matrix" replace />} />
          </Route>
        </Routes>
      </CoordinatorMatrixProvider>
    </BrowserRouter>
  );
};
