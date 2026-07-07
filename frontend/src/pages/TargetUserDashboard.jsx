import React, { useEffect, useState, useRef } from "react";
import { SiLeetcode, SiGithub } from "react-icons/si";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import git from "../assets/github.webp";
import { IoStatsChartSharp } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { getTrackerDataOfTargetUser } from "../redux/slices/targetUserSlice";
import * as THREE from "three";
import folder from "../assets/folder.png";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import TotalQuestions from "../assets/TotalQuestions.png";
import GitContribution from "../assets/GitContribution.png";
import streak from "../assets/Streak.png";
import Ranking from "../assets/Ranking.png";
import pr from "../assets/pull-request.png";
import fork from "../assets/code-fork.png";
import link from "../assets/Link.jpg";

function TargetUserDashboard() {
  const { library_id } = useParams();
  const dispatch = useDispatch();
  const [data, setData] = useState();
  const user = useSelector((state) => state.targetUser.data);
  const loading = useSelector((state) => state.targetUser.loading);
  const [date, setDate] = useState("");
  const [showAll, setShowAll] = useState(false);

  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    dispatch(getTrackerDataOfTargetUser({ library_id }));
  }, [dispatch, library_id]);

  useEffect(() => {
    setData(user);
  }, [user]);

  useEffect(() => {
    const date = new Date();
    const ist = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    setDate(ist);
  }, []);

  useEffect(() => {
    let vantaInstance = null;
    let isMounted = true;

    const initVanta = async () => {
      try {
        if (!vantaRef.current || vantaEffect.current) return;

        const VANTA = await import("vanta/dist/vanta.net.min");

        if (isMounted && vantaRef.current) {
          vantaInstance = VANTA.default({
            el: vantaRef.current,
            THREE: THREE,
            mouseControls: false,
            touchControls: false,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0xfff5,
            backgroundColor: 0x000000,
            points: 20.0,
            maxDistance: 10.0,
            spacing: 20.0,
          });
          vantaEffect.current = vantaInstance;
        }
      } catch (error) {
        console.error("Vanta initialization failed:", error);
      }
    };

    const timeoutId = setTimeout(initVanta, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (vantaInstance) {
        vantaInstance.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className="flex items-center justify-center min-h-screen w-full bg-gray-950"
    >
      <div className="flex-1 p-4 md:p-8 min-h-screen w-full z-10">
        <div className="mb-6 md:mb-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 lg:pt-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white">
              Hello, {data?.name}
            </h1>
            <p className="text-sm text-gray-400">Today is {date}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          <div className="backdrop-blur-sm rounded-4xl shadow-[0_0_15px_#0ec1e7]/50 border border-[#0ec1e7] text-white w-full flex items-center justify-around p-4 lg:py-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={TotalQuestions}
                  alt="TotalSolved-icon"
                  className="w-6 h-6 md:w-7 md:h-7"
                />
                <h2 className="font-medium text-lg md:text-xl">
                  Total Questions
                </h2>
              </div>
              <p className="text-gray-400 text-sm md:text-base">
                Number of questions Solved🚀
              </p>
            </div>
            <span className="text-3xl md:text-4xl font-bold">
              {data?.leetcode.solvedProblems === -1
                ? "N/A"
                : data?.leetcode.solvedProblems}
            </span>
          </div>
          <div className="backdrop-blur-sm rounded-4xl shadow-[0_0_15px_#0ec1e7]/50 border border-[#0ec1e7] text-white flex items-center justify-around p-4 lg:py-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={Ranking}
                  alt="ranking-icon"
                  className="w-6 h-6 md:w-7 md:h-7"
                />
                <h2 className="font-medium text-lg md:text-xl">Ranking</h2>
              </div>
              <p className="text-gray-400 text-sm md:text-base">
                Overall Leaderboard Ranking👑
              </p>
            </div>
            <span className="text-3xl md:text-4xl font-bold">
              {data?.rank === -1 ? "N/A" : data?.rank}
            </span>
          </div>

          <div className="backdrop-blur-sm rounded-4xl border border-[#0ec1e7] shadow-[0_0_15px_#0ec1e7]/50 text-white flex items-center justify-around p-4 lg:py-6 md:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={streak}
                  alt="Streak-icon"
                  className="w-6 h-6 md:w-7 md:h-7"
                />
                <h2 className="font-medium text-lg md:text-xl">Past days</h2>
              </div>
              <p className="text-gray-400 text-sm md:text-base">
                Consistency heat map🔥
              </p>
            </div>
            <span className="text-3xl font-bold flex gap-1">
              {data?.past5.map((day, index) => (
                <div
                  key={index}
                  className={`${day == 0 ? "bg-red-500" : "bg-green-500"
                    } w-4 h-4 md:w-5 md:h-5 rounded-md`}
                ></div>
              ))}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-7 my-4 md:my-5">
          <div className="backdrop-blur-sm rounded-2xl shadow-xl border border-white flex text-white flex-col  p-4 md:p-7">
            <h2 className="flex items-center gap-2">
              <IoStatsChartSharp size={"1.5rem"} />
              <span className="text-xl md:text-2xl font-medium">DSA Stats</span>
            </h2>
            <div className="border-t border-gray-600 my-4" />

            <div className="flex flex-col lg:flex-row justify-between items-center w-full my-4 md:my-5 md:mb-10 gap-4">
              <div className="text-base flex lg:flex-col flex-row gap-4 lg:gap-8 justify-between w-full font-semibold md:text-xl px-10">
                <div className="text-[#00e676] flex">
                  Easy:
                  <div className="text-white">{data?.leetcode.easy}</div>
                </div>
                <div className="text-[#ff9100] flex">
                  Medium:
                  <div className="text-white">{data?.leetcode.medium}</div>
                </div>
                <div className="text-[#f44336] flex">
                  Hard:
                  <div className="text-white">{data?.leetcode.hard}</div>
                </div>
              </div>

              <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto">
                <div className="aspect-square w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {(() => {
                        const pieData = [
                          {
                            name: "Easy",
                            value: data?.leetcode.easy || 0,
                            fill: "#00e676",
                          },
                          {
                            name: "Medium",
                            value: data?.leetcode.medium || 0,
                            fill: "#ff9100",
                          },
                          {
                            name: "Hard",
                            value: data?.leetcode.hard || 0,
                            fill: "#f44336",
                          },
                        ].filter((item) => item.value > 0);

                        const getResponsiveSizes = () => {
                          return {
                            innerRadius: "35%",
                            outerRadius: "65%",
                            labelOffset: 25,
                            fontSize: 12,
                          };
                        };

                        const {
                          innerRadius,
                          outerRadius,
                          labelOffset,
                          fontSize,
                        } = getResponsiveSizes();

                        return (
                          <Pie
                            data={pieData}
                            dataKey="value"
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            paddingAngle={5}
                            cornerRadius={5}
                            stroke="none"
                            labelLine={false}
                            label={({
                              cx,
                              cy,
                              midAngle,
                              outerRadius: pieOuterRadius,
                              value,
                              fill,
                            }) => {
                              const RADIAN = Math.PI / 180;
                              const radius =
                                typeof pieOuterRadius === "string"
                                  ? Math.min(cx, cy) * 0.65 // Fallback calculation
                                  : pieOuterRadius;

                              const x =
                                cx +
                                (radius + labelOffset) *
                                Math.cos(-midAngle * RADIAN);
                              const y =
                                cy +
                                (radius + labelOffset) *
                                Math.sin(-midAngle * RADIAN);

                              return (
                                <text
                                  x={x}
                                  y={y}
                                  fill={fill}
                                  fontSize={fontSize}
                                  fontWeight="600"
                                  textAnchor={x > cx ? "start" : "end"}
                                  dominantBaseline="central"
                                  className="drop-shadow-sm"
                                >
                                  {value}
                                </text>
                              );
                            }}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                        );
                      })()}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Easy
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Medium
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Hard
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="flex items-center gap-2">
              <img src={git} alt="" className="w-8" />
              <span className="text-xl md:text-2xl font-medium">
                GitHub Stats
              </span>
            </h2>
            <div className="border-t border-gray-600 my-4" />

            <div className="grid grid-cols-3 gap-2 md:gap-5 w-full my-4 md:my-5 md:mb-10">
              <div className="border w-full flex flex-col justify-center items-center border-gray-700 rounded-lg py-3  transition-transform duration-300 hover:scale-105">
                <h1 className="text-green-500 text-2xl md:text-3xl font-medium">
                  {data?.github.contributions}
                </h1>
                <span className="flex items-center gap-0.5">
                  <img
                    src={GitContribution}
                    alt="Contribution-icon"
                    className="w-6 h-6 md:w-7 md:h-7"
                  />
                  <span className="text-base md:text-xl">Contributions</span>
                </span>
              </div>

              <div className="border w-full flex flex-col justify-center items-center border-gray-700 rounded-lg py-3 transition-transform duration-300 hover:scale-105">
                <h1 className="text-2xl md:text-3xl text-orange-400 font-medium">
                  {data?.github.prs}
                </h1>
                <span className="flex items-center gap-0.5">
                  <img
                    src={pr}
                    alt="Pr-icon"
                    className="w-6 h-6 md:w-7 md:h-7"
                  />
                  <span className="text-base md:text-xl">Total PRs</span>
                </span>
              </div>

              <div className="border w-full flex flex-col justify-center items-center border-gray-700 rounded-lg py-3 transition-transform duration-300 hover:scale-105">
                <h1 className="text-2xl md:text-3xl text-red-700 font-medium">
                  {data?.github.repos}
                </h1>
                <span className="flex items-center gap-0.5">
                  <img
                    src={fork}
                    alt="Fork-icon"
                    className="w-6 h-6 md:w-7 md:h-7"
                  />
                  <span className="text-base md:text-xl">Total Repos</span>
                </span>
              </div>
            </div>
          </div>
          <div className="backdrop-blur-sm rounded-2xl shadow-xl border border-white flex flex-col text-white p-4 md:p-7 justify-between">
            <div className="mb-4 md:mb-8 h-auto md:h-1/5">
              <div className="text-xl md:text-2xl flex justify-between items-center w-full gap-2 font-medium mb-4 md:mb-5">
                <h2>Skills</h2>
              </div>
              <div className="border-t border-gray-600 mb-6" />

              <div className="w-full h-30 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-400 scrollbar-track-transparent  ">
                <div className="flex flex-wrap gap-2 min-w-full">
                  {data?.skills.length !== 0 ? (
                    data?.skills.map((skill, index) => (
                      <div
                        key={index}
                        className="border block items-center text-wrap justify-center shadow-[0_0_8px_#0ec1e7]/50 backdrop-blur-sm border-[#0ec1e7]/40 rounded-lg p-1 px-2 md:px-3 text-sm md:text-base"
                      >
                        <span>{skill}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No Skills added yet..</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start w-full">
              <div className="text-xl md:text-2xl flex items-center gap-4 font-medium mb-4 md:mb-7">
                <h2>Language for DSA</h2>
              </div>
              <div className="border-t border-gray-600 mb-6 w-full" />
              <span className="text-xl md:text-2xl w-fit font-medium border border-gray-700 rounded-lg p-2 md:p-3">
                {data?.dsaLanguage}
              </span>
            </div>

            <div className=" flex flex-col items-start w-full">
              <div className="text-xl md:text-2xl flex justify-between items-center w-full gap-2 font-medium mb-4 md:mb-7">
                <h2>Platforms</h2>
              </div>
              <div className="border-t border-gray-600 mb-6 w-full" />
              <div className="flex gap-1.5">
                {data?.leetcode.url !== "" && (
                  <a
                    href={data?.leetcode.url}
                    className="text-xl md:text-2xl w-fit font-medium border border-gray-700 rounded-lg p-2 md:p-3 hover:bg-gray-800 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>
                      <SiLeetcode />
                    </span>
                  </a>
                )}
                {data?.github.url !== "" && (
                  <a
                    href={data?.github.url}
                    className="text-xl md:text-2xl w-fit font-medium border border-gray-700 rounded-lg p-2 md:p-3 hover:bg-gray-800 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>
                      <SiGithub />
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="w-full mt-4 md:mt-5">
          <div className="w-full h-full backdrop-blur-sm rounded-2xl shadow-xl border border-white p-4 px-4 md:px-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-white font-medium  md:text-2xl">
                Projects
              </span>
            </div>

            <div className="flex justify-center">
              {data?.projects?.length == 0 || !data?.projects ? (
                <div className="flex flex-col justify-center items-center">
                  <div
                    className="border rounded-md h-49 w-80 mt-6 bg-cover bg-center"
                    style={{ backgroundImage: `url(${folder})` }}
                  ></div>

                  <p className="text-gray-200 text-xl font-medium mt-6 mb-2">
                    {" "}
                    Currently no Projects are added.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  {(showAll ? data.projects : data.projects.slice(0, 3))?.map((project, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-[#0ec1e7]/60 flex flex-col gap-2 transition-transform duration-300 hover:scale-105"
                      >
                        <div className="w-full h-44 md:h-52 border-b-gray-600 border-b-2 rounded-t-lg overflow-hidden flex items-center justify-center">
                          <img
                            src={project.coverImage}
                            alt={project.projectName}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="p-4 pt-0">
                          <p className="text-white text-start flex items-center gap-1 text-xl font-semibold mb-2">
                            <Star color="gold" fill="gold" />
                            {project.projectName}
                          </p>
                          {project.websiteUrl !== "" && (
                            <a
                              href={project.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 flex gap-2 text-sm md:text-base mb-2"
                            >
                              <img
                                src={link}
                                alt=""
                                className="w-5 h-5 text-[#0ec1e7]/60"
                              />
                              <p>View Project</p>
                            </a>
                          )}
                          <a
                            href={project.githubUrl}
                            target="blank"
                            className="border-[#0ec1e7]/60 border gap-2 flex text-gray-300 mb-1 p-1 px-2 rounded-full items-center xl:w-fit"
                          >
                            <img src={git} alt="git" className="w-5 h-5" />
                            <p className="overflow-hidden">
                              {project.githubUrl.split("com/")[1]}
                            </p>
                          </a>{" "}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {data?.projects.length > 3 && (
                <button onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TargetUserDashboard;
