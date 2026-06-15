/** Returns "First L." for public/UI display. Falls back to the full name when only one token exists. */
export function displayMentorName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? fullName;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last[0]?.toUpperCase() ?? ""}.`;
}
