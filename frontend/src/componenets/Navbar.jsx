import React, { useState, useEffect } from "react";
import logo from '../assets/CPBYTE_LOGO.jpg';
import { RiHome4Line } from "react-icons/ri";
import { GrSchedulePlay } from "react-icons/gr";
import { IoMdSettings } from "react-icons/io";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AiOutlinePieChart } from "react-icons/ai";
import { IoStatsChartOutline } from "react-icons/io5";
import { LogOut, Menu, Wrench, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { refreshDash } from "../redux/slices/profileSlice";
import { authRefresh, logoutUser } from "../redux/slices/authSlice";
import { refreshAttendance } from "../redux/slices/getDomainUserSlice";
import { refreshEvent } from "../redux/slices/eventSlice";
import toast from "react-hot-toast";
import { resetCheckStatus } from "../redux/slices/checkStatus";
import { refreshTracker } from "../redux/slices/TrackerSlice";
import { GoTrophy } from "react-icons/go";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useSelector(state => state.dashboard.data);
  const dispatch = useDispatch();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const getActiveClass = (path) => {
    return location.pathname === path ? 'bg-[#212327] text-[#0ec1e7]' : 'text-gray-300';
  };

  const logout = async() => {
    const toastId = toast.loading("Logging Out")
      dispatch(logoutUser());
      dispatch(refreshAttendance())
      dispatch(refreshDash())
      dispatch(refreshEvent())
      dispatch(authRefresh())
      dispatch(refreshTracker())
      dispatch(resetCheckStatus())
      localStorage.removeItem("token")
      navigate("/login");
      toast.success("Logged out",{
        id:toastId
      })
  };

  const isMobile = windowWidth < 768;

  return (
    <>
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-[#070b0f] border-b border-gray-800 flex items-center justify-between px-4 z-30 shadow-md">
          {!isOpen && (
            <button 
              onClick={() => setIsOpen(true)} 
              className="p-2 bg-[#212327] rounded-md text-white hover:bg-[#0ec1e7] transition-colors duration-200"
            >
              <Menu size={24} />
            </button>
          )}
          {isOpen && <div className="w-10"></div>}
          
          <div className="flex items-center gap-2">
            <img src={logo} alt="CPBYTE Logo" className="w-8 h-8 rounded-full" />
            <h2 className="text-white text-lg font-semibold">
              CP<span className="text-[#0ec1e7]">BYTE</span>
            </h2>
          </div>
          <div className="w-10"></div>
        </div>
      )}
      {isMobile && isOpen && (
        <div className="fixed top-4 right-4 z-50">
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 bg-[#212327] rounded-md text-white hover:bg-[#0ec1e7] transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>
      )}
      <div 
        className={`Sidebar bg-[#070b0f] border-r border-gray-600 min-h-screen flex fixed justify-between overflow-hidden z-50 transition-all duration-300 ease-in-out
          ${isMobile 
            ? isOpen 
              ? 'w-64 opacity-100' 
              : 'w-0 opacity-0' 
            : 'w-60'}`}
      >
        <div className="flex flex-col items-center h-full w-full m-4">
          <div className="flex items-center gap-2 justify-start w-full">
            <img src={logo} alt="" className="w-12 md:w-14 rounded-full" />
            <h2 className="text-white text-lg md:text-xl tracking-wider font-semibold">
              CP<span className="text-[#0ec1e7]">BYTE</span>
            </h2>
          </div>
          <div className="flex flex-col gap-4 items-start justify-start w-full mt-4">
            <h2 className="text-gray-300 text-xs md:text-sm pl-4 md:pl-6 tracking-widest">
              MAIN MENU
            </h2>
            <div className="flex flex-col gap-3 md:gap-4 w-full">
              <Link
                to={""}
                className={`flex items-center gap-2 hover:bg-[#212327] ${getActiveClass("/")} hover:text-[#0ec1e7] duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
              >
                <RiHome4Line size={isMobile ? 18 : 20} />
                <h2>Dashboard</h2>
              </Link>
              <Link
                to={"Schedule"}
                className={`flex items-center gap-2 hover:bg-[#212327] ${getActiveClass("/Schedule")} hover:text-[#0ec1e7] duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
              >
                <GrSchedulePlay size={isMobile ? 18 : 20} />
                <h2>Schedule</h2>
              </Link>
              {(role === "COORDINATOR" || role === "LEAD") && 
                <Link
                  to={"Attendance"}
                  className={`flex items-center gap-2 hover:bg-[#212327] ${getActiveClass("/Attendance")} hover:text-[#0ec1e7] duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
                >
                  <AiOutlinePieChart size={isMobile ? 18 : 20} />
                  <h2>Attendance</h2>
                </Link>
              }
              <Link 
                to={"Tracker"} 
                className={`flex items-center gap-2 hover:bg-[#212327] ${getActiveClass("/Tracker")} hover:text-[#0ec1e7] duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
                >
                  <IoStatsChartOutline size={isMobile ? 18 : 20}/>
                  <h2>Tracker</h2>
              </Link>
              <Link
                to={"Leaderboard"}
                className={`flex items-center gap-2 hover:bg-[#212327] ${getActiveClass("/Leaderboard")} hover:text-[#0ec1e7] duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
              >
                <GoTrophy size={isMobile ? 18 : 20} />
                <h2>Leaderboard</h2>
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-start justify-start w-full mt-4">
            <h2 className="text-gray-300 text-xs md:text-sm pl-4 md:pl-6 tracking-widest">
              SETTINGS
            </h2>
            <div className="flex flex-col gap-3 md:gap-4 w-full">
              <Link
                to={"Settings"}
                className={`flex items-center gap-2 hover:bg-[#212327] ${getActiveClass("/Settings")} hover:text-[#0ec1e7] duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
              >
                <IoMdSettings size={isMobile ? 18 : 20} />
                <h2>Settings</h2>
              </Link>
              <Link
                to={"ManageTracker"}
                className={`flex items-center gap-2 hover:bg-[#212327] ${getActiveClass("/ManageTracker")} hover:text-[#0ec1e7] duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
              >
                <Wrench size={isMobile ? 18 : 20} />
                <h2>Manage Tracker</h2>
              </Link>
              <button
                onClick={logout}
                className={`flex items-center text-red-700 gap-2 hover:bg-[#212327] hover:text-red-500 duration-200 w-full p-2 pl-4 md:pl-6 rounded-md cursor-pointer text-sm md:text-base`}
              >
                <LogOut size={isMobile ? 18 : 20} />
                <h2>LogOut</h2>
              </button>
            </div>
          </div>
        </div>
      </div>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export default Navbar;