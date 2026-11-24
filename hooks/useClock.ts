"use client";

import { useEffect, useState } from "react";
import { formatLongDate, pad2, toDateKey } from "@/lib/dates";

export interface ClockSnapshot {
  ready: boolean;
  now: Date;
  todayKey: string;
  timeShort: string;
  period: string;
  dateLong: string;
  greeting: string;
}

function buildSnapshot(now: Date, ready: boolean): ClockSnapshot {
  const h = now.getHours();
  const m = now.getMinutes();
  const period = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;

  let greeting = "Buenas noches";
  if (h >= 5 && h < 12) greeting = "Buenos días";
  else if (h >= 12 && h < 19) greeting = "Buenas tardes";

  return {
    ready,
    now,
    todayKey: toDateKey(now),
    timeShort: `${h12}:${pad2(m)}`,
    period,
    dateLong: formatLongDate(now),
    greeting,
  };
}

const FALLBACK_DATE = new Date(2026, 0, 1, 9, 0, 0, 0);

export function useClock(): ClockSnapshot {
  const [snapshot, setSnapshot] = useState<ClockSnapshot>(() =>
    buildSnapshot(FALLBACK_DATE, false),
  );

  useEffect(() => {
    const update = () => setSnapshot(buildSnapshot(new Date(), true));
    const immediate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 10_000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(interval);
    };
  }, []);

  return snapshot;
}
