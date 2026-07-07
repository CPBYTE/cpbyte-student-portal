import React, { useEffect, useState, useRef, useCallback } from "react";
import trophy from "../assets/trophy.png";
import noimage from "../assets/noImage.webp";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchPage, fetchTop } from "../redux/slices/Leaderboard";
import LeaderboardSkeleton from "../componenets/LeaderboardSkeleton";
import * as THREE from 'three';
import "./LeaderBoard.css";

const Leaderboard = () => {
  const dispatch = useDispatch();
  const { topUsers, total: totalFromStore, loading } = useSelector((state) => state.leaderboard);

  const [allUsers, setAllUsers] = useState([]);
  const pageRef = useRef(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");

  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const vantaRef = useRef(null);
  const vantaEffect = useRef(null); 

  useEffect(() => {
    let isMounted = true;

    const loadVanta = async () => {
      const VANTA = await import('vanta/dist/vanta.net.min');

      if (isMounted && !vantaEffect.current) {
        vantaEffect.current = VANTA.default({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0xfff5,
          backgroundColor: 0x000000,
          points: 20.00,
          maxDistance: 10.00,
          spacing: 20.00
        });
      }
    };
    loadVanta();
    return () => {
      isMounted = false;
      if (vantaEffect.current) vantaEffect.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (vantaEffect.current) vantaEffect.current.resize();
  }, [allUsers, topUsers]);

  const loadPage = useCallback(async (pageToLoad) => {
    if (isFetching || !hasMore) return;
    setIsFetching(true);

    const payload = {
      page: pageToLoad,
      limit: itemsPerPage,
      language: selectedLanguage === "All" ? undefined : selectedLanguage,
      year: selectedYear === "All" ? undefined : selectedYear,
    };

    try {
      const result = await dispatch(fetchPage(payload));
      const payloadData = result?.payload;
      const users = Array.isArray(payloadData?.users) ? payloadData.users : [];
      const totalCount = typeof payloadData?.total === "number" ? payloadData.total : (payloadData?.users?.length ?? 0);

      setAllUsers(prev => {
        return [...prev, ...users];
      });

      setTotal(totalCount);

      setHasMore((prevAcc) => {
        const newAccumulated = allUsers.length + users.length;
        return newAccumulated < totalCount;
      });

      pageRef.current = pageToLoad + 1;
    } catch (err) {
      setHasMore(false);
      console.error("Failed to fetch leaderboard page:", err);
    } finally {
      setIsFetching(false);
    }
  }, [dispatch, isFetching, hasMore, itemsPerPage, selectedLanguage, selectedYear, allUsers.length]);

  useEffect(() => {
    setAllUsers([]);
    pageRef.current = 0;
    setHasMore(true);
    setTotal(0);

    dispatch(fetchTop({
      language: selectedLanguage === "All" ? undefined : selectedLanguage,
      year: selectedYear === "All" ? undefined : selectedYear,
      limit: 3
    })).catch((e) => {
      console.warn("fetchTop failed", e);
    });

    loadPage(0);
  }, [selectedLanguage, selectedYear, itemsPerPage]);

  const sentinelRef = useRef(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isFetching && hasMore) {
          loadPage(pageRef.current);
        }
      });
    }, {
      root: null,
      rootMargin: "300px",
      threshold: 0.1
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [loadPage, isFetching, hasMore]);

  const getGlobalIndex = (idxOnPage, localIndex) => {
    return idxOnPage + 1;
  };

  return (
    <div className="relative min-h-screen w-full bg-black">
      <div ref={vantaRef} className="fixed inset-0 z-0" />
      <div className="relative z-10 min-h-screen w-full">
        <div className="p-4 w-full lg:p-8 min-h-screen">
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-extrabold my-4 text-center text-white drop-shadow-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
              Leaderboard
            </h1>

            <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-6 sm:mb-8 w-full max-w-md mx-auto">
              <select
                className="px-4 py-2 rounded-lg cursor-pointer bg-[#000000b2] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="All">All Languages</option>
                <option value="CPP">CPP</option>
                <option value="JAVA">Java</option>
              </select>

              <select
                className="px-4 py-2 rounded-lg cursor-pointer bg-[#000000b2] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === "All" ? "All" : parseInt(e.target.value))}
              >
                <option value="All">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>

              <select
                className="px-4 py-2 rounded-lg cursor-pointer bg-[#000000b2] text-white border border-gray-700 focus:outline-none"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
              >
                <option value={10}>10 / batch</option>
                <option value={20}>20 / batch</option>
                <option value={50}>50 / batch</option>
              </select>
            </div>

            {allUsers.length === 0 && loading ? (
              <LeaderboardSkeleton />
            ) : (
              <div className="w-full p-4 lg:px-0 lg:py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full mb-12 px-4 sm:px-0">
                  {topUsers?.map((item, index) => (
                    <div
                      key={item.id}
                      className={`relative glow-card group w-full flex flex-col text-white rounded-xl p-4 sm:p-5 backdrop-blur-sm bg-gradient-to-br ${index === 0
                        ? "from-amber-500/10 to-amber-600/10 border border-amber-500/30 sm:col-span-2 lg:col-span-1"
                        : index === 1
                          ? "from-gray-500/10 to-gray-600/10 border border-gray-500/30"
                          : "from-yellow-700/10 to-yellow-800/10 border border-yellow-700/30"
                        }`}
                    >
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center z-10">
                        <div className={`absolute w-full h-full rounded-full ${index === 0 ? "bg-amber-500/20" : index === 1 ? "bg-gray-500/20" : "bg-yellow-700/20"}`}></div>
                        <img src={trophy} alt="trophy" className={`w-8 h-8 sm:w-10 sm:h-10 ${index === 0 ? "filter drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" : ""}`} />
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 pr-16 sm:pr-20">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-cyan-400/50 flex-shrink-0">
                          <img src={item?.avatar || noimage} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                        <Link to={`/Tracker/${item.library_id}`} className="font-bold text-lg sm:text-xl hover:text-cyan-400 transition-colors truncate min-w-0 flex-1">
                          {item?.name}
                        </Link>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-auto">
                        <div className="flex flex-col items-center p-2 sm:p-3 bg-gray-900/50 rounded-lg">
                          <h2 className="text-gray-400 text-xs sm:text-sm font-medium">Rank</h2>
                          <h1 className="text-white text-lg sm:text-xl font-bold mt-1">{index + 1}</h1>
                        </div>

                        <div className="flex flex-col items-center p-2 sm:p-3 bg-gray-900/50 rounded-lg">
                          <h2 className="text-gray-400 text-xs sm:text-sm font-medium">Total</h2>
                          <h1 className="text-white text-lg sm:text-xl font-bold mt-1">{item?.solvedProblems}</h1>
                        </div>

                        <div className="flex flex-col items-center p-2 sm:p-3 bg-gray-900/50 rounded-lg">
                          <h2 className="text-gray-400 text-xs sm:text-sm font-medium">Language</h2>
                          <h1 className="text-white text-base sm:text-xl font-bold mt-1 truncate">{item?.language}</h1>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#000000b2] backdrop-blur-sm rounded-xl border border-gray-700 overflow-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-800">
                      <tr className="text-left">
                        <th className="py-3 px-3 sm:py-4 sm:px-6 text-gray-300 text-xs sm:text-sm font-bold uppercase tracking-wider">Rank</th>
                        <th className="py-3 px-3 sm:py-4 sm:px-6 text-gray-300 text-xs sm:text-sm font-bold uppercase tracking-wider">Name</th>
                        <th className="py-4 px-6 text-gray-300 text-sm font-bold uppercase tracking-wider">Total</th>
                        <th className="py-4 px-6 text-gray-300 text-sm font-bold uppercase tracking-wider">Year</th>
                        <th className="py-4 px-6 text-gray-300 text-sm font-bold uppercase tracking-wider">Language</th>
                        <th className="py-4 px-6 text-gray-300 text-sm font-bold uppercase tracking-wider hidden sm:table-cell">Previous</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((item, idx) => {
                        const globalIndex = idx;
                        return (
                          <tr key={item.id + "-" + idx} className="border-b border-gray-800 hover:bg-[#141414b8] transition-colors">
                            <td className="py-3 px-3 sm:py-4 sm:px-6 text-white font-medium">
                              <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-base rounded-full ${globalIndex < 3 ? (globalIndex === 0 ? "bg-amber-500/20 text-amber-300" : globalIndex === 1 ? "bg-gray-500/20 text-gray-300" : "bg-yellow-700/20 text-yellow-300") : "bg-gray-700 text-gray-300"}`}>
                                {globalIndex + 1}
                              </span>
                            </td>

                            <td className="py-3 px-3 sm:py-4 sm:px-6">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center border border-cyan-400/30">
                                  <img src={item.avatar || noimage} alt="avatar" className="w-full h-full object-cover" loading="lazy" />
                                </div>
                                <Link to={`/Tracker/${item?.library_id}`} className="text-white hover:text-cyan-400 transition-colors text-nowrap md:w-fit w-24 overflow-clip truncate">{item.name}</Link>
                              </div>
                            </td>

                            <td className="py-4 px-6 text-white font-bold">{item.solvedProblems}</td>

                            <td className="py-4 px-6 text-white"><span className="bg-gray-800 px-3 py-1 rounded-full text-sm text-nowrap">Year {item.year}</span></td>

                            <td className="py-3 px-3 sm:py-4 sm:px-6 text-white"><span className={`px-2 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm rounded-full ${item.language === "CPP" ? "bg-blue-500/20 text-blue-300" : "bg-green-500/20 text-green-300"}`}>{item.language}</span></td>

                            <td className="py-4 px-6 hidden sm:table-cell">
                              <div className="flex gap-1">
                                {item.previous?.map((day, j) => (
                                  <div key={j} className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-md flex items-center justify-center ${day === 0 ? "bg-red-500/30" : "bg-green-500/30"}`}>
                                    <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${day === 0 ? "bg-red-400" : "bg-green-400"}`}></div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div ref={sentinelRef} className="h-8 flex items-center justify-center">
                  {isFetching ? <div className="text-gray-300">Loading more...</div> : !hasMore ? <div className="text-gray-400">No more users</div> : null}
                </div>

                <div className="mt-4 text-sm text-gray-300">
                  Showing {allUsers.length ? 1 : 0} - {allUsers.length} of {total || totalFromStore || 0}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;