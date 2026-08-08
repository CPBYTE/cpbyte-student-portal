import React from 'react'
import UserLayout from './pages/UserLayout'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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
import { useEffect } from 'react'
import { setAccessToken, axiosInstance } from '../src/lib/axios.js'
import { toast } from 'react-hot-toast'
function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const publicRoutes = ["/login", "/forgot-password", "/reset-password"];
      const isPublicRoute = publicRoutes.includes(window.location.pathname);

      try {
        const res = await axiosInstance.post("/auth/refresh", {}, { withCredentials: true });
        if (isMounted) {
          setAccessToken(res.data.accessToken);
        }
      } catch (err) {
        if (isMounted) {
          console.log("No refresh token or expired → redirecting to login", err);
          if (!isPublicRoute) {
            toast.error("Session expired, please login again.");
            navigate("/login");
          }
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

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
