import React, { useEffect, useState, useRef } from "react";
import SkeletonLoader from "../componenets/SkeletonLoader";
import noimage from "../assets/noImage.webp";
import { useDispatch, useSelector } from "react-redux";
import { markAttendance, fetchOverallAttendance } from "../redux/slices/attendanceSlice";
import MarkAttendanceProtector from "../componenets/MarkAttendanceProtector";
import { updateStatus } from "../redux/slices/checkStatus";
import { toast } from "react-hot-toast";
import AttendanceAlreadyMarked from "../componenets/AttendanceAlreadyMarked";
import * as THREE from "three";

const MarkAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState({});
  const [activeSelector, setActiveSelector] = useState(null);
  const [isMarked, setIsMarked] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Tab and summary states
  const [activeTab, setActiveTab] = useState("mark"); // "mark" or "summary"
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryFilter, setSummaryFilter] = useState("all"); // "all", "low_dsa", "low_dev", "low_any"
  const [summarySortBy, setSummarySortBy] = useState("name"); // "name", "dsa_desc", "dsa_asc", "dev_desc", "dev_asc"

  const { subject } = useSelector((state) => state.checkStatus);
  const [DSA, setDSA] = useState(subject);
  const { domain_dev, domain_dsa, name, role } = useSelector(
    (state) => state.dashboard.data
  );
  const allMembers = useSelector((state) => state.attendance.data);
  const { overallAttendance, overallLoading } = useSelector((state) => state.markAttendance);
  const dispatch = useDispatch();

  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    if (activeTab === "summary") {
      dispatch(fetchOverallAttendance());
    }
  }, [dispatch, activeTab]);

  const handleGlobalPresent = () => {
    if (activeSelector === "PRESENT") {
      setActiveSelector(null);
      setSelectedStatus({});
    } else {
      setActiveSelector("PRESENT");
      const updated = {};
      permissionRequests.forEach((item) => {
        updated[item.library_id] = "PRESENT";
      });
      setSelectedStatus(updated);
    }
  };

  const handleGlobalAbsent = () => {
    if (activeSelector === "ABSENT") {
      setActiveSelector(null);

      const updated = { ...selectedStatus };
      Object.keys(updated).forEach((key) => {
        if (updated[key] === "ABSENT_WITHOUT_REASON") {
          delete updated[key];
        }
      });
      setSelectedStatus(updated);
    } else {
      setActiveSelector("ABSENT");
      const updated = { ...selectedStatus };
      let count = 0;

      permissionRequests.forEach((item) => {
        if (!updated[item.library_id]) {
          updated[item.library_id] = "ABSENT_WITHOUT_REASON";
          count++;
        }
      });

      setSelectedStatus(updated);
      if (count > 0) {
        toast.success(`Marked ${count} remaining members as Absent`);
      } else {
        toast("All members are already marked");
      }
    }
  };

  useEffect(() => {
    const loadVanta = async () => {
      try {
        const VANTA = await import("vanta/dist/vanta.net.min");
        if (!vantaEffect.current && vantaRef.current) {
          vantaEffect.current = VANTA.default({
            el: vantaRef.current,
            THREE: THREE,
            mouseControls: false,
            touchControls: false,
            gyroControls: false,
            color: 0xfff5,
            backgroundColor: 0x0,
            points: 20.0,
            maxDistance: 10.0,
            spacing: 20.0,
            material: new THREE.LineBasicMaterial({
              color: 0xfff5,
              vertexColors: false,
            }),
          });
        }
      } catch (error) {
        console.error("Failed to load Vanta animation:", error);
      }
    };
    loadVanta();
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  const confirmToast = (present, absent, excused) =>
    new Promise((resolve) => {
      toast.custom((t) => (
        <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#212327] text-white p-6 rounded-2xl shadow-2xl w-[95vw] max-w-3xl border border-white/10">
            <h3 className="text-3xl font-semibold mb-6">Confirm Attendance Submission</h3>
            <p className="text-xl mb-2">Present: {present}</p>
            <p className="text-xl mb-2">Absent: {absent}</p>
            <p className="text-xl mb-4">Excused: {excused}</p>
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-sm px-5 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="bg-[#0ec1e7] hover:bg-[#0ea2e7] text-sm px-5 py-2 rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ));
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = permissionRequests.map((req) => ({
      library_id: req.library_id,
      status: selectedStatus[req.library_id] || "ABSENT_WITHOUT_REASON",
    }));

    let present = 0, absent = 0, excused = 0;
    result.forEach(({ status }) => {
      if (status === "PRESENT") present++;
      else if (status === "ABSENT_WITH_REASON") excused++;
      else absent++;
    });

    const confirm = await confirmToast(present, absent, excused);
    if (!confirm) return;

    const toastId = toast.loading("Marking Attendance...");
    setIsSubmitting(true);

    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const res = await dispatch(
      markAttendance({
        responses: result,
        subject: DSA ? "DSA" : "DEV",
        date,
      })
    );

    if (res.meta.requestStatus === "fulfilled") {
      dispatch(updateStatus({ domain: DSA ? domain_dsa : domain_dev, date }));
      setIsMarked(2);
      toast.success("Attendance marked successfully", { id: toastId });
    } else {
      toast.error("Failed to mark attendance", { id: toastId });
    }
    setIsSubmitting(false);
  };

  const handleStatusChange = (id, status) => {
    setActiveSelector(null);
    setSelectedStatus((prev) => ({
      ...prev,
      [id]: status,
    }));
  };

  useEffect(() => {
    setLoading(true);
    setDSA(subject);
    const timeout = setTimeout(() => {
      const members = DSA ? allMembers?.dsaMembers : allMembers?.devMembers;
      setPermissionRequests(Array.isArray(members) ? members : []);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [DSA, isMarked, subject, allMembers]);

  const filteredRequests = permissionRequests.filter((req) => {
    if (!req || !req.name || !req.library_id) return false;
    const query = searchQuery.toLowerCase();
    return (
      req.name.toLowerCase().includes(query) ||
      String(req.library_id).toLowerCase().includes(query)
    );
  });

  const filteredSummaryStudents = (overallAttendance || [])
    .filter((student) => {
      if (!student || !student.name || !student.library_id) return false;
      const query = summarySearch.toLowerCase();
      const matchesSearch =
        student.name.toLowerCase().includes(query) ||
        student.library_id.toLowerCase().includes(query);

      let matchesFilter = true;
      if (summaryFilter === "low_dsa") {
        matchesFilter = (student.dsaAttendance || 0) < 75;
      } else if (summaryFilter === "low_dev") {
        matchesFilter = (student.devAttendance || 0) < 75;
      } else if (summaryFilter === "low_any") {
        matchesFilter = (student.dsaAttendance || 0) < 75 || (student.devAttendance || 0) < 75;
      }

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (summarySortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (summarySortBy === "dsa_desc") {
        return (b.dsaAttendance || 0) - (a.dsaAttendance || 0);
      } else if (summarySortBy === "dsa_asc") {
        return (a.dsaAttendance || 0) - (b.dsaAttendance || 0);
      } else if (summarySortBy === "dev_desc") {
        return (b.devAttendance || 0) - (a.devAttendance || 0);
      } else if (summarySortBy === "dev_asc") {
        return (a.devAttendance || 0) - (b.devAttendance || 0);
      }
      return 0;
    });

  if (role !== "COORDINATOR" && role !== "LEAD") {
    return (
      <div className="text-white min-h-screen w-full p-4 md:p-8 bg-[#070b0f]">
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-3xl font-bold text-red-500 mb-2">403</h1>
          <p className="text-base text-gray-300">You are not authorized to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full text-white pb-16 overflow-hidden bg-gray-950">
      <div ref={vantaRef} className="fixed inset-0 z-0 w-full h-full" />

      <div className="relative z-10 p-4 md:p-8 flex flex-col items-center min-h-screen">
        <div className="absolute top-14 sm:top-6 right-6 bg-[#1c1c1c]/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 shadow z-10">
          <div className="w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center">
            {name?.charAt(0)?.toUpperCase() || "C"}
          </div>
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-gray-400 uppercase">{role}</p>
          </div>
        </div>

        <div className="w-full max-w-6xl relative z-10">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <div className="w-2 h-8 bg-[#0ec1e7] rounded-sm" />
              {activeTab === "mark" ? "Mark Member Attendance" : "Overall Attendance Summary"}
            </h1>

            <div className="flex bg-[#1c1c1c]/60 border border-white/10 rounded-xl p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab("mark")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "mark"
                    ? "bg-[#0ec1e7] text-black font-semibold shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Mark Attendance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "summary"
                    ? "bg-[#0ec1e7] text-black font-semibold shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Attendance Summary
              </button>
            </div>
          </div>

          {activeTab === "mark" && (
            <>
              {isMarked === 1 && (
                <div className="flex flex-col md:flex-row justify-between w-full items-start md:items-end mb-4">
                  <div>
                    <div className="inline-block mb-2 px-4 py-1 rounded-md bg-[#0ec1e7] text-black font-semibold text-sm shadow">
                      {DSA ? "DSA Attendance" : "DEV Attendance"}
                    </div>
                    <p className="text-sm text-gray-300 mt-2">
                      {filteredRequests.length} {DSA ? "DSA" : "DEV"} Members Found
                      <br />
                      Attendance for Date:{" "}
                      <span className="font-medium">{new Date().toDateString()}</span>
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-end md:items-center mt-4 md:mt-0 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                      <input
                        type="text"
                        placeholder="Search Name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1c1c1c]/60 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#0ec1e7] transition-colors"
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={handleGlobalAbsent}
                        className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 border whitespace-nowrap font-medium ${activeSelector === "ABSENT"
                          ? "bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                          : "bg-red-900/20 text-red-400 border-red-500/30 hover:bg-red-900/40"
                          }`}
                      >
                        {activeSelector === "ABSENT" ? "Unselect Absent" : "Mark Rest Absent"}
                      </button>

                      <button
                        type="button"
                        onClick={handleGlobalPresent}
                        className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 border whitespace-nowrap font-medium flex items-center gap-2 ${activeSelector === "PRESENT"
                          ? "bg-green-600 text-white border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.5)]"
                          : "bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-900/40"
                          }`}
                      >
                        <span>{activeSelector === "PRESENT" ? "Unselect Present" : "Mark All Present"}</span>
                        {activeSelector === "PRESENT" && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isMarked === 0 && <MarkAttendanceProtector setIsMarked={setIsMarked} />}

              {isMarked === 1 && (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#1c1c1c]/40 backdrop-blur-md shadow-lg">
                  {loading ? (
                    <SkeletonLoader />
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <div className="max-h-[600px] overflow-y-auto overflow-x-auto border border-[#2c2f34] rounded">
                        <table className="min-w-full text-sm text-white text-center table-fixed" style={{ minWidth: "650px" }}>
                          <thead className="sticky top-0 bg-[#1f1f1f] z-10">
                            <tr>
                              <th className="px-4 py-2 w-[8%]">S No.</th>
                              <th className="px-4 py-2 w-[25%]">Name</th>
                              <th className="px-4 py-2 w-[22%]">Library ID</th>
                              <th className="px-4 py-2 w-[20%]">Attendance</th>
                              <th className="px-4 py-2 w-[25%]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2c2f34]">
                            {filteredRequests.map((req, idx) => (
                              <tr key={req.library_id} className="border-b border-[#2c2f34]">
                                <td className="px-4 py-4">{idx + 1}</td>
                                <td className="px-4 py-4 h-full">
                                  <div className="flex items-center justify-start gap-2 h-full">
                                    <img
                                      src={noimage}
                                      className="h-6 w-6 rounded-full object-cover"
                                      alt="Member"
                                    />
                                    <span>{req.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">{req.library_id}</td>
                                <td className="px-4 py-4">
                                  {DSA ? req.dsaAttendance : req.devAttendance}%
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex gap-2 flex-wrap justify-center">
                                    {["PRESENT", "ABSENT_WITHOUT_REASON", "ABSENT_WITH_REASON"].map(
                                      (status) => {
                                        const isSelected = selectedStatus[req.library_id] === status;

                                        let btnStyle = "";
                                        if (status === "PRESENT") {
                                          btnStyle = isSelected
                                            ? "bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.6)] font-bold scale-105 border-transparent"
                                            : "bg-green-950/20 text-green-500/70 border border-green-500/20 hover:border-green-500/60";
                                        } else if (status === "ABSENT_WITHOUT_REASON") {
                                          btnStyle = isSelected
                                            ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] font-bold scale-105 border-transparent"
                                            : "bg-red-950/20 text-red-500/70 border border-red-500/20 hover:border-red-500/60";
                                        } else { 
                                          btnStyle = isSelected
                                            ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)] font-bold scale-105 border-transparent"
                                            : "bg-blue-950/20 text-blue-500/70 border border-blue-500/20 hover:border-blue-500/60";
                                        }

                                        return (
                                          <button
                                            key={status}
                                            type="button"
                                            onClick={() => handleStatusChange(req.library_id, status)}
                                            className={`text-xs px-3 py-1.5 rounded transition-all duration-200 ${btnStyle}`}
                                          >
                                            {status === "ABSENT_WITHOUT_REASON" ? "Absent" : status === "ABSENT_WITH_REASON" ? "Excused" : "Present"}
                                          </button>
                                        );
                                      }
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredRequests.length === 0 && (
                              <tr>
                                <td colSpan="5" className="py-8 text-center text-gray-400">
                                  No members found matching "{searchQuery}"
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end mt-4 p-4">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className={`bg-[#0ec1e7] hover:bg-[#0ea2e7] px-4 py-2 rounded text-white text-sm transition-colors cursor-pointer ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        >
                          {isSubmitting ? "Submitting..." : "Submit"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {isMarked === 2 && <AttendanceAlreadyMarked setIsMarked={setIsMarked} />}
            </>
          )}

          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* KPI Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Students */}
                <div className="bg-[#1c1c1c]/40 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-[#0ec1e7]/30 transition-all duration-300">
                  <div className="absolute -right-4 -bottom-4 text-cyan-500/10 group-hover:text-cyan-500/20 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Students</h3>
                  <p className="text-3xl font-bold text-white mt-2">{(overallAttendance || []).length}</p>
                </div>

                {/* Avg DSA Attendance */}
                <div className="bg-[#1c1c1c]/40 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-[#0ec1e7]/30 transition-all duration-300">
                  <div className="absolute -right-4 -bottom-4 text-blue-500/10 group-hover:text-blue-500/20 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Avg DSA Attendance</h3>
                  <p className="text-3xl font-bold text-[#0ec1e7] mt-2">
                    {(overallAttendance || []).length
                      ? Math.round(overallAttendance.reduce((acc, user) => acc + (user.dsaAttendance || 0), 0) / overallAttendance.length)
                      : 0}%
                  </p>
                </div>

                {/* Avg DEV Attendance */}
                <div className="bg-[#1c1c1c]/40 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-[#0ec1e7]/30 transition-all duration-300">
                  <div className="absolute -right-4 -bottom-4 text-[#a855f7]/10 group-hover:text-[#a855f7]/20 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Avg DEV Attendance</h3>
                  <p className="text-3xl font-bold text-[#a855f7] mt-2">
                    {(overallAttendance || []).length
                      ? Math.round(overallAttendance.reduce((acc, user) => acc + (user.devAttendance || 0), 0) / overallAttendance.length)
                      : 0}%
                  </p>
                </div>

                {/* Low Attendance Students */}
                <div className="bg-[#1c1c1c]/40 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
                  <div className="absolute -right-4 -bottom-4 text-red-500/10 group-hover:text-red-500/20 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Attendance Alert</h3>
                  <p className="text-3xl font-bold text-red-500 mt-2">
                    {(overallAttendance || []).filter((user) => (user.dsaAttendance || 0) < 75 || (user.devAttendance || 0) < 75).length} <span className="text-xs text-gray-400 font-normal">(&lt; 75%)</span>
                  </p>
                </div>
              </div>

              {/* Filters and Search toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1c1c1c]/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by student name or library ID..."
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    className="w-full bg-[#121315]/80 border border-white/10 rounded-lg px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-[#0ec1e7] transition-colors"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Filter:</span>
                    <select
                      value={summaryFilter}
                      onChange={(e) => setSummaryFilter(e.target.value)}
                      className="bg-[#121315]/85 text-white border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0ec1e7] cursor-pointer"
                    >
                      <option value="all">All Students</option>
                      <option value="low_dsa">Low DSA (&lt; 75%)</option>
                      <option value="low_dev">Low DEV (&lt; 75%)</option>
                      <option value="low_any">Low DSA/DEV (&lt; 75%)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Sort:</span>
                    <select
                      value={summarySortBy}
                      onChange={(e) => setSummarySortBy(e.target.value)}
                      className="bg-[#121315]/85 text-white border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0ec1e7] cursor-pointer"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="dsa_desc">DSA (High to Low)</option>
                      <option value="dsa_asc">DSA (Low to High)</option>
                      <option value="dev_desc">DEV (High to Low)</option>
                      <option value="dev_asc">DEV (Low to High)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Summary Table */}
              <div className="rounded-xl overflow-hidden border border-white/10 bg-[#1c1c1c]/40 backdrop-blur-md shadow-lg">
                {overallLoading ? (
                  <SkeletonLoader />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-white text-center">
                      <thead className="bg-[#1f1f1f] border-b border-[#2c2f34]">
                        <tr>
                          <th className="px-6 py-3.5 w-[8%] font-semibold text-gray-300 uppercase tracking-wider">S No.</th>
                          <th className="px-6 py-3.5 text-left font-semibold text-gray-300 uppercase tracking-wider">Student Name</th>
                          <th className="px-6 py-3.5 font-semibold text-gray-300 uppercase tracking-wider">Library ID</th>
                          <th className="px-6 py-3.5 font-semibold text-gray-300 uppercase tracking-wider">DSA Attendance</th>
                          <th className="px-6 py-3.5 font-semibold text-gray-300 uppercase tracking-wider">DEV Attendance</th>
                          <th className="px-6 py-3.5 font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2c2f34]">
                        {filteredSummaryStudents.map((student, idx) => {
                          const isLowDsa = student.dsaAttendance < 75;
                          const isLowDev = student.devAttendance < 75;

                          return (
                            <tr key={student.library_id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4 text-gray-400 font-medium">{idx + 1}</td>
                              <td className="px-6 py-4 text-left font-medium">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={noimage}
                                    className="h-8 w-8 rounded-full object-cover border border-white/10"
                                    alt="Student avatar"
                                  />
                                  <span className="font-semibold text-white">{student.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-300 font-mono text-xs">{student.library_id}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`font-bold ${isLowDsa ? "text-red-400" : "text-green-400"}`}>
                                    {student.dsaAttendance}%
                                  </span>
                                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${student.dsaAttendance}%` }}
                                      className={`h-full rounded-full ${isLowDsa ? "bg-red-500" : "bg-green-500"}`}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`font-bold ${isLowDev ? "text-red-400" : "text-green-400"}`}>
                                    {student.devAttendance}%
                                  </span>
                                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${student.devAttendance}%` }}
                                      className={`h-full rounded-full ${isLowDev ? "bg-red-500" : "bg-green-500"}`}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudent(student)}
                                  className="text-xs px-3.5 py-1.5 rounded-lg bg-[#0ec1e7]/10 text-[#0ec1e7] border border-[#0ec1e7]/20 hover:bg-[#0ec1e7] hover:text-black transition-all duration-200 font-medium"
                                >
                                  View History
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredSummaryStudents.length === 0 && (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-gray-400">
                              No students found matching your filters/search
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detail History Modal */}
          {selectedStudent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-[#18191b] border border-white/10 text-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={noimage}
                      className="h-10 w-10 rounded-full object-cover border border-white/10"
                      alt="Student"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedStudent.name}</h3>
                      <p className="text-xs text-gray-400 font-mono">ID: {selectedStudent.library_id}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Attendance Summary Mini-Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">DSA Attendance</span>
                      <span className={`text-2xl font-bold mt-1 ${selectedStudent.dsaAttendance < 75 ? "text-red-400" : "text-green-400"}`}>
                        {selectedStudent.dsaAttendance}%
                      </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">DEV Attendance</span>
                      <span className={`text-2xl font-bold mt-1 ${selectedStudent.devAttendance < 75 ? "text-red-400" : "text-green-400"}`}>
                        {selectedStudent.devAttendance}%
                      </span>
                    </div>
                  </div>

                  {/* Timeline History */}
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Attendance Log History</h4>
                    <div className="space-y-3">
                      {selectedStudent.attendances && selectedStudent.attendances.length > 0 ? (
                        [...selectedStudent.attendances]
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((log, idx) => {
                            const dateStr = new Date(log.date).toLocaleDateString("en-IN", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            });

                            let badgeStyle = "";
                            let label = "";
                            if (log.status === "PRESENT") {
                              badgeStyle = "bg-green-500/10 text-green-400 border-green-500/20";
                              label = "Present";
                            } else if (log.status === "ABSENT_WITHOUT_REASON") {
                              badgeStyle = "bg-red-500/10 text-red-400 border-red-500/20";
                              label = "Absent";
                            } else {
                              badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                              label = "Excused";
                            }

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
                                    log.subject === "DSA"
                                      ? "bg-[#0ec1e7]/10 text-[#0ec1e7] border-[#0ec1e7]/25"
                                      : "bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/25"
                                  }`}>
                                    {log.subject}
                                  </span>
                                  <span className="text-sm font-medium text-gray-200">{dateStr}</span>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full border font-bold ${badgeStyle}`}>
                                  {label}
                                </span>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">No attendance history logged for this student.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-white/10 bg-[#121315] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkAttendance;