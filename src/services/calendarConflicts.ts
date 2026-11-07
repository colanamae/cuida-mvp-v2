import type {GoogleCalendarEntry} from './googleCalendar.ts';

/**
 * Intervalos são [início, fim): um evento que termina exatamente quando outro
 * começa não é considerado conflito. Inclui eventos de dia inteiro.
 */
export function overlappingCalendarEvents(
    events: GoogleCalendarEntry[],
    proposedStart: Date,
    proposedEnd: Date,
): GoogleCalendarEntry[] {
    const start = proposedStart.getTime();
    const end = proposedEnd.getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

    return events.filter((event) => {
        // As datas de eventos de dia inteiro são interpretadas no calendário local.
        // O fim de eventos de dia inteiro é exclusivo no Google Calendar.
        const parse = (value: string) => {
            if (event.allDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                const [year, month, day] = value.split('-').map(Number);
                return new Date(year, month - 1, day).getTime();
            }
            return new Date(value).getTime();
        };
        const eventStart = parse(event.startsAt);
        const eventEnd = event.endsAt ? parse(event.endsAt) : eventStart + (event.allDay ? 86400000 : 60000);
        return Number.isFinite(eventStart) && Number.isFinite(eventEnd)
            && start < eventEnd && end > eventStart;
    });
}
