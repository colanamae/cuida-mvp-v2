export function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function preferredName(metadata: Record<string, unknown> | undefined, memberName?: string) {
  const names = [metadata?.preferred_name, metadata?.display_name, metadata?.full_name, metadata?.name, memberName];
  const name = names.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return name?.trim().split(/\s+/)[0] || 'você';
}

export function fullDate(now: Date) {
  const value = new Intl.DateTimeFormat('pt-BR', {weekday:'long', day:'numeric',month:'long',year:'numeric'}).format(now);
  return value[0].toLocaleUpperCase('pt-BR') + value.slice(1);
}
