import { useMemo } from "react";
import type { GoogleCalendarEntry } from "../services/googleCalendar";
import "../styles/calendar-timeline.css";

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 76;
export const calendarDayKey = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
const addDays = (day: Date, count: number) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() + count);
const shortDate = (day: Date) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(day)
    .replace(".", "");
const timeLabel = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
export const calendarEventTime = (item: GoogleCalendarEntry) =>
  item.allDay
    ? "Dia todo"
    : `${timeLabel(new Date(item.startsAt))}${item.endsAt ? "–" + timeLabel(new Date(item.endsAt)) : ""}`;

function overlappingLayout(events: GoogleCalendarEntry[], date: Date) {
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const dayEnd = addDays(date, 1).getTime();
  const minTime = dayStart + START_HOUR * 3600000;
  const maxTime = dayStart + END_HOUR * 3600000;
  const candidates = events
    .filter((event) => !event.allDay)
    .map((event) => {
      const start = new Date(event.startsAt).getTime();
      const endValue = event.endsAt
        ? new Date(event.endsAt).getTime()
        : start + 30 * 60000;
      const end = Math.max(endValue, start + 15 * 60000);
      return {
        event,
        start: Math.max(minTime, start),
        end: Math.min(maxTime, dayEnd, end),
      };
    })
    .filter((item) => Number.isFinite(item.start) && item.end > item.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: Array<{
    event: GoogleCalendarEntry;
    top: number;
    height: number;
    col: number;
    count: number;
  }> = [];
  let group: typeof candidates = [];
  let groupEnd = -Infinity;
  const commit = () => {
    if (!group.length) return;
    const columns: number[] = [];
    const assigned = group.map((item) => {
      let column = columns.findIndex((end) => end <= item.start);
      if (column < 0) {
        column = columns.length;
        columns.push(item.end);
      } else columns[column] = item.end;
      return { item, column };
    });
    assigned.forEach(({ item, column }) =>
      result.push({
        event: item.event,
        top: ((item.start - minTime) / 3600000) * HOUR_HEIGHT,
        height: Math.max(28, ((item.end - item.start) / 3600000) * HOUR_HEIGHT),
        col: column,
        count: columns.length,
      }),
    );
    group = [];
  };
  for (const candidate of candidates) {
    if (group.length && candidate.start >= groupEnd) {
      commit();
      groupEnd = -Infinity;
    }
    group.push(candidate);
    groupEnd = Math.max(groupEnd, candidate.end);
  }
  commit();
  return result;
}

export function CalendarTimeline({
  days,
  events,
  color,
  onOpen,
  onChoose,
  selected,
  now = new Date(),
}: {
  days: Date[];
  events: GoogleCalendarEntry[];
  color: (entry: GoogleCalendarEntry) => string;
  onOpen: (event: GoogleCalendarEntry) => void;
  onChoose: (date: Date) => void;
  selected: Date;
  now?: Date;
}) {
  const hours = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i,
  );
  const byDay = useMemo(
    () =>
      days.map((day) => ({
        date: day,
        entries: events.filter((e) => {
          if (e.allDay) {
            const key = calendarDayKey(day);
            return (
              e.startsAt.slice(0, 10) <= key &&
              (!e.endsAt || e.endsAt.slice(0, 10) > key)
            );
          }
          const starts = new Date(e.startsAt).getTime();
          const ends = e.endsAt ? new Date(e.endsAt).getTime() : starts + 60000;
          return (
            Number.isFinite(starts) &&
            starts < addDays(day, 1).getTime() &&
            ends >
              new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
              ).getTime()
          );
        }),
      })),
    [days.map(calendarDayKey).join("|"), events],
  );
  const isWeek = days.length === 7;
  return (
    <div
      className={`cola-timeline ${isWeek ? "cola-timeline-week" : "cola-timeline-day"}`}
    >
      <div
        className="cola-timeline-scroll"
        tabIndex={0}
        aria-label="Grade de horários: role para ver todos os horários"
      >
        <div
          className="cola-timeline-layout"
          style={{ minWidth: isWeek ? 675 : 0 }}
        >
          <div className="cola-timeline-header">
            <div className="cola-timeline-gutter" />
            {byDay.map(({ date }) => (
              <button
                type="button"
                key={calendarDayKey(date)}
                className={`cola-timeline-date ${calendarDayKey(date) === calendarDayKey(selected) ? "selected" : ""}`}
                onClick={() => onChoose(date)}
              >
                <span>{shortDate(date)}</span>
                <strong>{date.getDate()}</strong>
              </button>
            ))}
          </div>
          <div className="cola-timeline-all-day">
            <span className="cola-timeline-all-label">Dia todo</span>
            {byDay.map(({ date, entries }) => (
              <div
                className="cola-timeline-all-column"
                key={calendarDayKey(date)}
              >
                {entries
                  .filter((e) => e.allDay)
                  .map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      className="cola-timeline-all-event"
                      style={{ background: color(e) }}
                      onClick={() => onOpen(e)}
                      title={e.title}
                    >
                      {e.title}
                    </button>
                  ))}
              </div>
            ))}
          </div>
          <div
            className="cola-timeline-body"
            style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
          >
            <div className="cola-timeline-hours">
              {hours.map((hour) => (
                <span
                  key={hour}
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                >
                  {hour}h
                </span>
              ))}
            </div>
            <div className="cola-timeline-columns">
              {byDay.map(({ date, entries }) => (
                <div
                  className="cola-timeline-column"
                  key={calendarDayKey(date)}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="cola-timeline-hour-line"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}
                  {overlappingLayout(entries, date).map(
                    ({ event, top, height, col, count }) => (
                      <button
                        type="button"
                        key={event.id}
                        className="cola-timeline-event"
                        style={{
                          top,
                          height,
                          left: `calc(${(col / count) * 100}% + 3px)`,
                          width: `calc(${100 / count}% - 6px)`,
                          background: color(event),
                        }}
                        title={`${event.title} · ${calendarEventTime(event)}`}
                        onClick={() => onOpen(event)}
                      >
                        <strong>{event.title}</strong>
                        <span>{calendarEventTime(event)}</span>
                      </button>
                    ),
                  )}
                  {calendarDayKey(date) === calendarDayKey(now) &&
                    now.getHours() >= START_HOUR &&
                    now.getHours() < END_HOUR && (
                      <div
                        className="cola-timeline-now"
                        style={{
                          top:
                            (now.getHours() -
                              START_HOUR +
                              now.getMinutes() / 60) *
                            HOUR_HEIGHT,
                        }}
                      />
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
