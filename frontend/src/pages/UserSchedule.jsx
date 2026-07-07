import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getEvents } from '../redux/slices/eventSlice';
import * as THREE from 'three';
import MonthlyOverview from '../componenets/MonthlyOverview';
import AddEvent from '../componenets/AddEvent';
import EventsDisplay from '../componenets/EventsDisplay';
import Day from './Day';

const UserSchedule = () => {
  const user = useSelector(state => state.dashboard.data);
  const { event } = useSelector(state => state.event);

  const dispatch = useDispatch();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
          backgroundColor: 0x0,
          points: 20.00,
          maxDistance: 10.00,
          spacing: 20.00
        });
      }
    };

    loadVanta();

    return () => {
      isMounted = false;
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatMonthKey = (currentMonth) => {
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
  }

  useEffect(() => {
    async function getMonthsEvents() {
      const month = formatMonthKey(currentMonth);

      if (event[month])
        return;
      dispatch(getEvents({ month }));
    }
    getMonthsEvents();

  }, [currentMonth]);

  useEffect(() => {
    if (vantaEffect.current) {
      vantaEffect.current.resize();
    }
  }, [selectedDate, event]);

  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const weekdays = isMobile ? ["S", "M", "T", "W", "T", "F", "S"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div ref={vantaRef} className="flex items-center justify-center min-h-screen w-full bg-gray-950">
      <div className="pt-16 text-gray-100 p-2 md:p-4 w-full py-6 md:py-12">
        <div className="max-w-5xl mx-auto">
          <header className="mb-4 md:mb-8">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <div className="flex items-center space-x-2">
                <div className='bg-[#0ec1e7] w-1 md:w-2 h-6 md:h-8 rounded-full'></div>
                <h1 className="text-xl md:text-3xl font-bold text-white">Schedule</h1>
              </div>
              <div className="flex space-x-1 md:space-x-2">
                <button onClick={prevMonth} className="p-1 md:p-2 rounded-full hover:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "24"} height={isMobile ? "18" : "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <h2 className="text-sm md:text-xl font-semibold flex items-center px-2 md:px-4">
                  {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <button onClick={nextMonth} className="p-1 md:p-2 rounded-full hover:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "24"} height={isMobile ? "18" : "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </header>
          {/* Weekday Names Row */}
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4">
            <div className="w-full md:flex-1">
              <div className="grid grid-cols-7 gap-1 mb-1 md:mb-2">
                {weekdays.map((day, index) => {
                  const isWeekend = day === "Sat" || day === "Sun";

                  return (
                    <div
                      key={index}
                      className={`text-center py-1 md:py-2 font-medium text-xs md:text-base rounded ${isWeekend ? "bg-[#0ec1e7] text-white" : "bg-white text-black"
                        }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              {/* Calendar Day Grid with alternating column colors */}
              <div className="grid grid-cols-7 gap-1 mb-4 md:mb-6">
                {days.map((day, index) => 
                <Day day={day} key={index} setSelectedDate={setSelectedDate} selectedDate={selectedDate} event={event} isMobile={isMobile} currentMonth={currentMonth} formatMonthKey={formatMonthKey} formatDateKey={formatDateKey}/>)}
              </div>
            </div>
            <MonthlyOverview currentMonth={currentMonth} event={event} formatMonthKey={formatMonthKey}/>
          </div>

          <EventsDisplay event={event} formatMonthKey={formatMonthKey} selectedDate={selectedDate} formatDateKey={formatDateKey} months={months} user={user} currentMonth={currentMonth}/>

          {user.role === "COORDINATOR" && <AddEvent selectedDate={selectedDate} months={months}/>}
        </div>
      </div >
    </div>
  );
};

export default UserSchedule;