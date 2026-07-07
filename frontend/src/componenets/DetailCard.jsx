import React from 'react';
import { FaChalkboardTeacher } from "react-icons/fa";
import { GiBattleGear } from "react-icons/gi";
import { DiCodeigniter } from "react-icons/di";
import { PiChalkboardTeacherBold } from "react-icons/pi";
import noimage from "../assets/noImage.webp";
import { useSelector } from 'react-redux';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function DetailCard() {
  const user = useSelector((state) => state.dashboard.data);

  return (
    <div className="w-full h-fit text-white p-2 md:p-5 mt-4 md:mt-5 md:mr-5">
      {/* Gradient for CircularProgressbar */}
      <svg style={{ height: 0 }}>
        <defs>
          <linearGradient id="gradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#8aeefd" />
            <stop offset="100%" stopColor="#0ec1e7" />
          </linearGradient>
        </defs>
      </svg>

      <div className="rounded-2xl border bg-[#000000b2] border-gray-700 p-4 md:p-8 flex flex-col gap-6 shadow-[0_0_20px_rgba(14,193,231,0.15)]">
        <div className="flex gap-2 items-center mb-2 md:mb-4">
          <div className="w-2 h-8 bg-[#0ec1e7] rounded-2xl"></div>
          <span className="text-white text-lg md:text-2xl font-bold">Detail Member</span>
        </div>

        {/* Avatar + Details */}
        <div className="flex flex-col md:flex-row gap-4 lg:gap-12 md:gap-6 items-center w-full">
          <div className="lg:w-32 lg:h-32 h-24 w-24 rounded-full overflow-hidden border-2 border-cyan-600 shadow-md">
            <img
              src={user?.avatar || noimage}
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-3 w-[80%]">
            <div className="text-center md:text-left">
              <span className="text-2xl font-semibold">{user?.name}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
              <InfoField label="Role" value={user?.role} />
              <InfoField label="DSA/DEV" value={`${user?.domain_dsa} / ${user?.domain_dev}`} />
              <InfoField label="Email" value={user?.email} tooltip />
              <InfoField label="Library ID" value={user?.library_id} />
            </div>
          </div>
        </div>

        {/* Attendance + Mentors */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ProgressCard
            value={user?.dsaAttendance || 0}
            label="DSA Attendance"
            icon={<GiBattleGear size={20} />}
          />
          <ProgressCard
            value={user?.devAttendance || 0}
            label="DEV Attendance"
            icon={<DiCodeigniter size={20} />}
          />

          <IconCard
            label="DSA Mentor"
            value={user?.mentor_dsa || "Not Assigned"}
            icon={<FaChalkboardTeacher size={24} />}
            assigned={!!user?.mentor_dsa}
          />
          <IconCard
            label="DEV Mentor"
            value={user?.mentor_dev || "Not Assigned"}
            icon={<PiChalkboardTeacherBold size={24} />}
            assigned={!!user?.mentor_dev}
          />
        </div>
      </div>
    </div>
  );
}

const InfoField = ({ label, value, tooltip = false }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[#949597] text-sm">{label}</span>
    <span
      className={`truncate ${tooltip ? 'cursor-help' : ''}`}
      title={tooltip ? value : undefined}
    >
      {value || '--'}
    </span>
  </div>
);

const ProgressCard = ({ value, label, icon }) => (
  <div className="flex gap-3 items-center bg-black border border-neutral-800 p-3 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-[0_0_15px_rgba(14,193,231,0.4)]">
    <div className="relative w-12 h-12">
      <CircularProgressbar
        value={value}
        strokeWidth={12}
        styles={buildStyles({
          pathColor: "url(#gradient)",
          trailColor: "#1f2937",
        })}
      />
      <div className="absolute inset-0 flex items-center justify-center text-white">
        {icon}
      </div>
    </div>
    <div className="flex flex-col gap-1 truncate">
      <span className="font-semibold text-base md:text-lg">{value}%</span>
      <span className="text-[#b7bdbf] text-xs md:text-sm">{label}</span>
    </div>
  </div>
);

const IconCard = ({ icon, label, value, assigned }) => (
  <div className="flex gap-3 items-center bg-black border border-neutral-800 p-3 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-[0_0_15px_rgba(14,193,231,0.4)]">
    <div className="rounded-full w-12 h-12 flex items-center justify-center bg-gradient-to-br from-cyan-700 to-[#8aeefd] shadow-md">
      {icon}
    </div>
    <div className="flex flex-col gap-1 truncate">
      <span
        className={`text-xs md:text-sm font-semibold px-2 py-1 rounded-full w-fit ${
          assigned ? "bg-green-700 text-white" : "bg-red-700 text-white"
        }`}
      >
        {value}
      </span>
      <span className="text-[#b7bdbf] text-xs md:text-sm">{label}</span>
    </div>
  </div>
);

export default DetailCard;
