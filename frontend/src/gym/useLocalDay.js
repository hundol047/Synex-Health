import { useEffect, useState } from "react";
import { dateKey, nextCalendarChange } from "./workflow.js";

const emptyCalendar = [];

export function useCalendarClock(appointments = emptyCalendar) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer;
    function refresh() {
      clearTimeout(timer);
      if (document.hidden) return;
      const current = Date.now();
      setNow(current);
      timer = setTimeout(refresh, Math.max(1, nextCalendarChange(appointments, current) - current));
    }
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [appointments]);
  return now;
}

export default function useLocalDay() {
  return dateKey(useCalendarClock());
}
