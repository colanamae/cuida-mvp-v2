import {supabase} from './supabase.ts';

export type CalendarResponsibility = { google_event_id: string; responsible_member_id: string | null };

export async function getCalendarResponsibilities(householdId: string): Promise<CalendarResponsibility[]> {
    const {
        data,
        error
    } = await supabase.from('calendar_responsibilities').select('google_event_id,responsible_member_id').eq('household_id', householdId);
    if (error) throw error;
    return data || [];
}

export async function saveCalendarResponsibility(householdId: string, eventId: string, memberId: string | null): Promise<void> {
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) throw new Error('Entre na sua conta para continuar.');
    const {error} = await supabase.from('calendar_responsibilities').upsert({
        household_id: householdId, google_event_id: eventId, responsible_member_id: memberId, user_id: user.id,
    }, {onConflict: 'user_id,household_id,google_event_id'});
    if (error) throw error;
}
