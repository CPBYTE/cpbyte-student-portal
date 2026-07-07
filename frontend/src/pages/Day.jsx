import React from "react";

function Day({
  day,
  selectedDate,
  event,
  formatMonthKey,
  currentMonth,
  isMobile,
  setSelectedDate,
  formatDateKey,
}) {
  const colorClasses = [
    "bg-fuchsia-600",

    "bg-violet-600",

    "bg-sky-500",

    "bg-cyan-500",

    "bg-emerald-500",

    "bg-amber-500",

    "bg-orange-500",

    "bg-rose-600",
  ];

  const dateKey = day ? formatDateKey(day) : null;

  const isToday =
    day &&
    day.getDate() === new Date().getDate() &&
    day.getMonth() === new Date().getMonth() &&
    day.getFullYear() === new Date().getFullYear();

  const isSelected =
    day &&
    day.getDate() === selectedDate.getDate() &&
    day.getMonth() === selectedDate.getMonth() &&
    day.getFullYear() === selectedDate.getFullYear();

  const dayEvents =
    dateKey && event[formatMonthKey(currentMonth)]
      ? event[formatMonthKey(currentMonth)][dateKey] || []
      : [];

  const cellHeightClass = isMobile ? "h-20 md:h-24" : "h-24";

  return (
    <div
      className={`p-1 ${cellHeightClass} border border-gray-600 rounded
                                ${isSelected ? "ring-2 ring-white" : ""}
                                hover:backdrop-blur hover:bg-white/5 `}
      onClick={() => day && setSelectedDate(day)}
    >
      {day && (
        <div className="relative z-0 group w-full h-full backdrop-blur cursor-pointer">
          {/* Date Number */}
          <div
            className={`text-xs p-1 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center mx-auto ${
              isToday ? "bg-[#0ec1e7] text-white" : "text-white"
            }`}
          >
            {day.getDate()}
          </div>

          {/* Visible Events (First 2) */}
          <div className="mt-1 space-y-0.5">
            {dayEvents.slice(0, 2).map((event) => {
              const randomColor =
                colorClasses[event.id.charCodeAt(0) % colorClasses.length];
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-1 px-1 py-0.5 rounded text-white text-xs truncate ${randomColor}`}
                >
                  <span className="w-2 h-2 rounded-full bg-white opacity-80"></span>
                  <span className="truncate" title={event.title}>
                    {event.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Hover Tooltip for Remaining Events */}
          {dayEvents.length > 2 && (
            <div className="absolute z-10 hidden group-hover:flex flex-col bg-gray-900 text-white text-xs p-2 rounded-lg shadow-lg top-1/2 left-1/2 -translate-x-1/2 w-max max-w-[150px]">
              {dayEvents.map((event) => {
                const randomColor =
                  colorClasses[event.id.charCodeAt(0) % colorClasses.length];
                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-1 mb-1 last:mb-0 rounded px-2 py-1 ${randomColor}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue opacity-80"></span>
                    <span className="truncate" title={event.title}>
                      {event.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Day;
