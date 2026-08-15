import type { RosterMember } from "@k0ii/schemas";

export function findMember(
  members: RosterMember[],
  query: string,
): RosterMember | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  if (/^\d{5,}$/.test(q)) {
    const byId = members.find((m) => m.robloxUserId === q);
    if (byId) return byId;
  }

  const exact = members.find((m) => m.displayName.toLowerCase() === q);
  if (exact) return exact;

  const starts = members.filter((m) =>
    m.displayName.toLowerCase().startsWith(q),
  );
  if (starts.length === 1) return starts[0]!;

  const includes = members.filter((m) =>
    m.displayName.toLowerCase().includes(q),
  );
  if (includes.length === 1) return includes[0]!;

  return null;
}

export function findMemberById(
  members: RosterMember[],
  robloxUserId: string,
): RosterMember | null {
  return members.find((m) => m.robloxUserId === robloxUserId) ?? null;
}

export function matchSuggestions(
  members: RosterMember[],
  query: string,
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const starts = members.filter((m) =>
    m.displayName.toLowerCase().startsWith(q),
  );
  if (starts.length > 1) {
    return starts.slice(0, 8).map((m) => m.displayName);
  }

  return members
    .filter((m) => m.displayName.toLowerCase().includes(q))
    .slice(0, 8)
    .map((m) => m.displayName);
}
