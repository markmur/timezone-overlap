import "./App.css";
import { rawTimeZones } from "@vvo/tzdb";
import Fuse from "fuse.js";
import cx from "classnames";

import { useCallback, useRef, useMemo, useState, ChangeEvent } from "react";

import useLocalStorageState from "./hooks/use-local-storage";
import useAutoAdjustFontSize from "./hooks/use-auto-adjust-text";

const fuse = new Fuse(rawTimeZones, {
  keys: ["countryName", "mainCities"],
  threshold: 0.1,
});

type TimeFormat = "12" | "24";

function getHourComparison(
  timeZones: string[],
  startTime: number,
  endTime: number
): [Date, Date, boolean][][] {
  // Convert the hour values to Date objects in the local time zone
  const startDate = new Date();
  startDate.setHours(startTime - 4);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  const endDate = new Date();
  endDate.setHours(endTime + 7);
  endDate.setMinutes(0);
  endDate.setSeconds(0);

  // Create an array to store the hour comparison tuples for each timezone
  const comparisons: [Date, Date, boolean][][] = [];

  // Loop through each timezone and generate the hour comparison tuples
  for (let timeZone of timeZones) {
    // Create an empty array to store the comparison tuples for this timezone
    const comparison: [Date, Date, boolean][] = [];

    // Loop through each hour in the range of times and add a tuple to the comparison array
    for (
      let time = new Date(startDate);
      time < endDate;
      time.setHours(time.getHours() + 1)
    ) {
      const time1 = new Date(time.toLocaleString("en-US", { timeZone }));
      const time2 = new Date(
        time.toLocaleString("en-US", { timeZone: timeZones[0] })
      );
      comparison.push([
        time1,
        time2,
        time1.getHours() >= startTime &&
          time1.getHours() <= endTime &&
          time2.getHours() >= startTime &&
          time2.getHours() <= endTime,
      ]);
    }

    // Add the comparison array for this timezone to the comparisons array
    comparisons.push(comparison);
  }

  // Return the array of comparisons
  return comparisons;
}

function formatHour(num: Date, timeFormat: TimeFormat = "24"): string {
  const [, ampm] = num
    .toLocaleTimeString([], {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    })
    .split(" ");

  const [hour] = num
    .toLocaleTimeString([], {
      hour12: timeFormat === "12",
      hour: "numeric",
      minute: "2-digit",
    })
    .split(" ");
  return `${hour}${ampm?.toLowerCase() ?? ""}`;
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const newTimezones = shuffle(rawTimeZones.flatMap((zone) => zone.mainCities));

function getBaseTimezone(fallback: string) {
  const [, city] = Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/");

  return city ?? fallback;
}

function getRemValue(N: number): number {
  const baseRemValue = 4; // define the base rem value
  const remValue = baseRemValue - N * 0.25; // decrease the rem value by 0.25 for each increment of N
  return remValue;
}

function App() {
  // Get users timezone or fallback to Dublin
  const baseTimezone = getBaseTimezone("Dublin");
  const [startTime, setStartTime] = useLocalStorageState("startTime", 9);
  const [endTime, setEndTime] = useLocalStorageState("endTime", 18);
  const [start, setState] = useLocalStorageState("base", baseTimezone);
  const [timezones, setTimezones] = useLocalStorageState<string[]>(
    "timezones",
    ["Berlin", "Toronto"]
  );
  const [timeFormat, setTimeFormat] = useLocalStorageState<TimeFormat>(
    "timeFormat",
    "24"
  );

  // private
  const [hover, setHover] = useState<number | null>(null);

  const findSelectedTimezone = useCallback((value: string) => {
    if (value.length < 2) return;
    return fuse.search(value) ?? [];
  }, []);

  const fallbackTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const getTimezone = useCallback(
    (name: string) => {
      return findSelectedTimezone(name)?.[0]?.item;
    },
    [findSelectedTimezone]
  );

  const getTimezoneName = useCallback(
    (name: string) => {
      return getTimezone(name)?.name ?? fallbackTimezone;
    },
    [fallbackTimezone, getTimezone]
  );

  const comparison = useMemo(() => {
    return getHourComparison(
      [getTimezoneName(start), ...timezones.map(getTimezoneName)],
      startTime,
      endTime
    );
  }, [start, timezones, startTime, endTime, getTimezoneName]);

  const ref = useRef<HTMLInputElement>(null);

  // useEffect(() => {
  //   const scrollPosition =
  //     ref.current?.querySelector<HTMLDivElement>('[data-key="9am"]')
  //       ?.offsetTop ?? 0;
  //   ref.current?.scrollTo(
  //     0,
  //     scrollPosition ? scrollPosition - ref.current.scrollTop : 0
  //   );
  // }, [comparison]);

  const handleTimeFormat = (value: "12" | "24") => () => {
    setTimeFormat(value);
  };

  function handleStartTimeChange(event: ChangeEvent<HTMLInputElement>) {
    const [hour] = event.target.value.split(":");
    setStartTime(parseInt(hour, 10));
  }

  function handleEndTimeChange(event: ChangeEvent<HTMLInputElement>) {
    const [hour] = event.target.value.split(":");
    setEndTime(parseInt(hour, 10));
  }

  const handleMouseOver = (hour: number) => () => {
    setHover(hour);
  };

  const handleMouseLeave = () => {
    setHover(null);
  };

  const withinShift = (hour: number) => {
    return hour >= startTime && hour <= endTime;
  };

  const handleAddTimezone = () => {
    if (timezones.length === 5) {
      return;
    }

    const nextTimezone = newTimezones.shift();
    if (typeof nextTimezone === "string") {
      setTimezones([...timezones, nextTimezone]);
    }
  };

  const handleRemoveTimezone = (index: number) => () => {
    const cloned = [...timezones];
    cloned.splice(index, 1);
    setTimezones(cloned);
  };

  const totalOverlap = useMemo(
    () =>
      Math.min(
        ...comparison.map((items) => items.filter((x) => x[2] === true).length)
      ),
    [comparison]
  );

  const fontSize = useMemo(
    () => `${getRemValue(timezones.length)}rem`,
    [timezones]
  );

  return (
    <main className="App">
      <header
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${timezones.length + 1}, 1fr)`,
        }}
      >
        <div>
          <small className="subdued primary">I work in</small>
          <input
            className="hugeInput"
            placeholder="Search..."
            value={start}
            style={{
              fontSize,
            }}
            onChange={(event) => {
              setState(event.target.value);
            }}
          />
          <small className="subdued">
            {getTimezoneName(start)} ({getTimezone(start)?.abbreviation})
          </small>
        </div>
        {timezones.map((timezone, i) => (
          <div key={`timezone-${i}`}>
            <small className="subdued primary">
              My team {i > 0 && "also"} works in
            </small>
            <input
              className="hugeInput"
              placeholder="Search..."
              value={timezone}
              style={{
                fontSize,
              }}
              onChange={(event) => {
                const cloned = [...timezones];
                cloned.splice(i, 1, event.target.value);
                setTimezones(cloned);
              }}
            />
            <small className="subdued">
              {getTimezoneName(timezone)} ({getTimezone(timezone)?.abbreviation}
              )
            </small>
            {timezones.length > 1 && (
              <button className="link" onClick={handleRemoveTimezone(i)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </header>

      <div
        className="content grid"
        ref={ref}
        style={{
          gridTemplateColumns: `repeat(${timezones.length + 1}, 1fr)`,
        }}
      >
        {comparison.map((item, i) => (
          <div key={i}>
            {item.map(([time1, time2, overlap1], i) => (
              <div key={String(time1)} className="block">
                {time1.getHours() === startTime && (
                  <sup className="start">start</sup>
                )}
                <div
                  data-key={time1}
                  onMouseOver={handleMouseOver(i)}
                  onMouseLeave={handleMouseLeave}
                  className={cx("timeBlock", {
                    overlap: overlap1,
                    shift: withinShift(time1.getHours()),
                    hover: hover === i,
                  })}
                >
                  <p>{formatHour(time1, timeFormat)}</p>
                </div>
                {time1.getHours() === endTime && <sup className="end">end</sup>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <footer>
        <small>
          <strong>Total overlap:</strong> {totalOverlap} hour
          {totalOverlap > 1 ? "s" : ""}
        </small>

        <div className="flex">
          <div className="hideOnMobile">
            <small>Start:</small>
            <input
              type="time"
              placeholder="Start"
              value={`${String(startTime).padStart(2, "0")}:00`}
              min="1"
              max="24"
              onChange={handleStartTimeChange}
            />
          </div>

          <div className="hideOnMobile">
            <small>End:</small>
            <input
              type="time"
              placeholder="End"
              value={`${String(endTime).padStart(2, "0")}:00`}
              min="1"
              max="24"
              onChange={handleEndTimeChange}
            />
          </div>

          <div className="switch hideOnMobile">
            <button
              onClick={handleTimeFormat("12")}
              className={cx({ selected: timeFormat === "12" })}
            >
              12h
            </button>
            <button
              onClick={handleTimeFormat("24")}
              className={cx({ selected: timeFormat === "24" })}
            >
              24h
            </button>
          </div>
          <button className="addTimezone" onClick={handleAddTimezone}>
            Add timezone
          </button>
        </div>
      </footer>
    </main>
  );
}

export default App;
