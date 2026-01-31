import React, { useEffect, useState, useRef } from "react";
import SkeletonLoader from "../componenets/SkeletonLoader";
import noimage from "../assets/noImage.webp";
import { useDispatch, useSelector } from "react-redux";
import { markAttendance } from "../redux/slices/attendanceSlice";
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

  const { subject } = useSelector((state) => state.checkStatus);
  const [DSA, setDSA] = useState(subject);
  const { domain_dev, domain_dsa, name, role } = useSelector(
    (state) => state.dashboard.data
  );
  const allMembers = useSelector((state) => state.attendance.data);
  const dispatch = useDispatch();

  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

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

  if (role !== "COORDINATOR") {
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

      <div className="relative z-10 p-4 mt-10 md:mt-0 md:p-8 flex flex-col items-center min-h-screen">
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
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <div className="w-2 h-8 bg-[#0ec1e7] rounded-sm" />
              Mark Member Attendance
            </h1>
          </div>

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
                  <div className="max-h-[600px] overflow-y-auto border border-[#2c2f34] rounded">
                    <table className="min-w-full text-sm text-white text-center table-fixed">
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
        </div>
      </div>
    </div>
  );
};

export default MarkAttendance;