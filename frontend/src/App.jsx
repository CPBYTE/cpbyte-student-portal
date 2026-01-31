import React from 'react'
import UserLayout from './pages/UserLayout'
import { Route, Routes } from 'react-router-dom'
import UserDashboard from './pages/UserDashboard'
import UserSchedule from './pages/UserSchedule'
import UserSettings from './pages/UserSettings'
import MarkAttendance from './pages/MarkAttendance'
import LoginPage from './pages/LoginPage'
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
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast'

function App() {
  const navigate = useNavigate();


  // useEffect(() => {
  //   if (location.pathname === "/login" || location.pathname === "/register") return;

  //   (async () => {
  //     try {
  //       const res = await axiosInstance.post("/auth/refresh", {}, { withCredentials: true });
  //       console.log("Refresh response:", res);
  //       setAccessToken(res.data.accessToken);
  //     } catch (err) {
  //       console.log("No refresh token or expired → redirecting to login",err);
  //       toast.error("Session expired, please login again.")
  //       navigate("/login");
  //     }
  //   })();
  // }, [navigate, location.pathname]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const res = await axiosInstance.post("/auth/refresh", {}, { withCredentials: true });
        if (isMounted) {
          setAccessToken(res.data.accessToken);
        }
      } catch (err) {
        if (isMounted) {
          console.log("No refresh token or expired → redirecting to login", err);
          toast.error("Session expired, please login again.");
          navigate("/login");
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);



  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
