import { useEffect, useState } from "react";
import { today } from "./store.js";

export default function useLocalDay() {
  const [day, setDay] = useState(today);
  useEffect(() => {
    let timer;
    function refresh() {
      clearTimeout(timer);
      setDay(today());
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - Date.now()));
    }
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return day;
}
