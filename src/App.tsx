import "./App.css";
import { rawTimeZones } from "@vvo/tzdb";
import Fuse from "fuse.js";
import cx from "classnames";

import {
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
} from "react";

const fuse = new Fuse(rawTimeZones, {
  keys: ["countryName", "mainCities"],
  threshold: 0.1,
});

type TimeFormat = "12" | "24";

function getHourComparisonV2(
  timeZones: string[],
  startTime: number,
  endTime: number,
  timeFormat: TimeFormat = "24"
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

const newTimezones = ["New York", "Colorado", "Vancouver"];

function App() {
  const [startTime, setStartTime] = useState(9);
  const [endTime, setEndTime] = useState(18);
  const [start, setState] = useState("Dublin");
  const [timezones, setTimezones] = useState<string[]>(["Berlin", "Toronto"]);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("24");
  const [hover, setHover] = useState<number | null>(null);

  const findSelectedTimezone = useCallback(
    (value: string) => {
      if (value.length < 2) return;
      return fuse.search(value) ?? [];
    },
    [fuse]
  );

  const fallbackTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const getTimezone = useCallback(
    (name: string) => {
      return findSelectedTimezone(name)?.[0]?.item;
    },
    [fallbackTimezone, findSelectedTimezone]
  );

  const getTimezoneName = useCallback(
    (name: string) => {
      return getTimezone(name)?.name ?? fallbackTimezone;
    },
    [fallbackTimezone, findSelectedTimezone]
  );

  const comparison = useMemo(() => {
    return getHourComparisonV2(
      [getTimezoneName(start), ...timezones.map(getTimezoneName)],
      startTime,
      endTime,
      timeFormat
    );
  }, [start, timezones, startTime, endTime, timeFormat]);

  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <main className="App">
      <header className="grid">
        <div>
          <small className="subdued primary">I work in</small>
          <input
            className="hugeInput"
            placeholder="Search..."
            value={start}
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
            <button className="link" onClick={handleRemoveTimezone(i)}>
              Remove
            </button>
          </div>
        ))}
      </header>

      <div className="content grid" ref={ref}>
        {comparison.map((item, i) => (
          <div key={i}>
            {item.map(([time1, time2, overlap1], i) => (
              <div
                key={String(time1)}
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
            ))}
          </div>
        ))}
      </div>

      <footer>
        <small>
          <strong>Total overlap:</strong>{" "}
          {comparison.reduce(
            (state, [, , overlap]) => (state += overlap ? 1 : 0),
            0
          )}{" "}
          hours
        </small>

        <div className="flex">
          <small>Start:</small>
          <input
            type="time"
            placeholder="Start"
            value={`${String(startTime).padStart(2, "0")}:00`}
            min="1"
            max="24"
            onChange={handleStartTimeChange}
          />

          <small>End:</small>
          <input
            type="time"
            placeholder="End"
            value={`${String(endTime).padStart(2, "0")}:00`}
            min="1"
            max="24"
            onChange={handleEndTimeChange}
          />

          <div className="switch">
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
