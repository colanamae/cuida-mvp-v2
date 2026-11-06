import {supabase} from './supabase.ts';

/** Events belong to the Google account explicitly connected by the current user. */
export type GoogleCalendarEntry = {
    id: string;
    calendarId: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    allDay: boolean;
    location?: string;
    organizer?: string;
    htmlLink?: string;
    attendees?: string[];
};
export type GoogleCalendarResult = { status: 'connected' | 'disconnected'; events: GoogleCalendarEntry[] };
export type NewGoogleEvent = {
    title: string;
    startsAt: string;
    endsAt: string;
    location?: string;
    description?: string;
    responsibleEmail?: string;
    reminderMinutes?: number | null;
};

async function callGoogle<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) throw new Error('Entre na sua conta para acessar o Google Agenda.');
    const response = await supabase.functions.invoke('google-calendar', {
        headers: {Authorization: `Bearer ${session.access_token}`},
        body: {action, ...body},
    });
    if (response.error) {
        const context = response.error.context as Response | undefined;
        if (context && typeof context.json === 'function') {
            const payload = await context.json().catch(() => null);
            if (payload?.status === 'disconnected') return payload as T;
            if (payload?.error) throw new Error(payload.error);
        }
        throw new Error('Não conseguimos acessar o Google Agenda. Confira a conexão e tente novamente.');
    }
    if (response.data?.error) throw new Error(response.data.error);
    return response.data as T;
}

export async function googleStatus(): Promise<{ status: 'connected' | 'disconnected' }> {
    return callGoogle('status');
}

export async function connectGoogleCalendar(): Promise<void> {
    const result = await callGoogle<{ url: string }>('auth-url');
    // Full-page navigation retains OAuth state on the server and returns to /agenda.
    window.location.assign(result.url);
}

export async function disconnectGoogleCalendar(): Promise<void> {
    await callGoogle('disconnect');
}

export async function getGoogleCalendarEvents(start: Date, end: Date): Promise<GoogleCalendarResult> {
    return callGoogle('list', {timeMin: start.toISOString(), timeMax: end.toISOString()});
}

export async function createGoogleCalendarEvent(event: NewGoogleEvent): Promise<{
    status: 'created';
    id: string;
    htmlLink?: string
}> {
    return callGoogle('create', {event});
}
