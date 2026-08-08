import React from 'react'
import UserLayout from './pages/UserLayout'
import { Route, Routes } from 'react-router-dom'
import UserDashboard from './pages/UserDashboard'
import UserSchedule from './pages/UserSchedule'
import UserSettings from './pages/UserSettings'
import MarkAttendance from './pages/MarkAttendance'
import LoginPage from './pages/LoginPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import UnauthProtected from './pages/UnauthProtected'
import TrackerDashboard from './pages/TrackerDashboard'
import TrackerManagement from './pages/TrackerManagement'
import AddProject from './componenets/AddProject'
import RemoveProject from './componenets/RemoveProject'
import SkillManagement from './componenets/SkillManagement'
import AddPlatforms from './componenets/AddPlatform'
import Leaderboard from './pages/Leaderboard'
import TargetUserDashboard from './pages/TargetUserDashboard'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <UnauthProtected>
              <UserLayout />
            </UnauthProtected>
          }
        >
          <Route path="" element={<UserDashboard />} />
          <Route path="Schedule" element={<UserSchedule />} />
          <Route path="Attendance" element={<MarkAttendance />} />
          <Route path="Settings" element={<UserSettings />} />
          
          <Route path="Tracker" element={<TrackerDashboard />} />
          <Route path="Tracker/:library_id" element={<TargetUserDashboard />} />
          <Route path="Leaderboard" element={<Leaderboard />} />
          <Route path="ManageTracker" element={<TrackerManagement />}>
            <Route path="AddProject" element={<AddProject />} />
            <Route path="RemoveProject" element={<RemoveProject />} />
            <Route path="SkillManagement" element={<SkillManagement />} />
            <Route path="" element={<AddPlatforms />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
