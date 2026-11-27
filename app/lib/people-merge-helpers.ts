// app/lib/people-merge-helpers.ts
// Pure helper logic for detecting duplicate people and merging profiles safely.

export interface MergeablePersonRecord {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  secondaryEmail?: string | null;
  familyEmail?: string | null;
  phone?: string | null;
  dateOfBirth: string | null;
  gender?: string | null;
  headshotUrl?: string | null;
  heightInches?: number | null;
  roles: string[];
  hasPassword?: boolean;
  passwordHash?: string | null;
  editedBio?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  medicalNotes?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  school?: string | null;
  tShirtSize?: string | null;
  externalUserId?: string | null;
  externalFamilyAccount?: string | null;
  familyId?: number | null;
  creditsCount?: number;
}

const NICKNAME_CANONICAL: Record<string, string> = {
  pam: "pamela",
  mike: "michael",
  mikey: "michael",
  matt: "matthew",
  matty: "matthew",
  sam: "samantha",
  sammy: "samantha",
  chris: "christopher",
  kate: "katherine",
  katie: "katherine",
  kathy: "katherine",
  cathy: "catherine",
  liz: "elizabeth",
  lizzie: "elizabeth",
  beth: "elizabeth",
  eliza: "elizabeth",
  ben: "benjamin",
  benny: "benjamin",
  will: "william",
  bill: "william",
  billy: "william",
  liam: "william",
  nick: "nicholas",
  nicky: "nicholas",
  abby: "abigail",
  alex: "alexander",
  dan: "daniel",
  danny: "daniel",
  dave: "david",
  joe: "joseph",
  joey: "joseph",
  josh: "joshua",
  jake: "jacob",
  rob: "robert",
  bob: "robert",
  bobby: "robert",
  robbie: "robert",
  tom: "thomas",
  tommy: "thomas",
  tim: "timothy",
  timmy: "timothy",
  jen: "jennifer",
  jenny: "jennifer",
  jess: "jessica",
  jessie: "jessica",
  maggie: "margaret",
  meg: "margaret",
  becca: "rebecca",
  becky: "rebecca",
  steph: "stephanie",
  zach: "zachary",
  zack: "zachary",
  nate: "nathan",
  gabe: "gabriel",
  charlie: "charles",
  andy: "andrew",
  drew: "andrew",
  tony: "anthony",
  steve: "steven",
  greg: "gregory",
  jon: "jonathan",
  allie: "allison",
  ally: "allison",
  maddie: "madeline",
  maddy: "madeline",
  ellie: "eleanor",
  emmy: "emily",
  mel: "melissa",
  vicky: "victoria",
  tori: "victoria",
  mandy: "amanda",
  kim: "kimberly",
  deb: "deborah",
  debbie: "deborah",
  sue: "susan",
  susie: "susan",
  pat: "patricia",
  patty: "patricia",
  trish: "patricia",
  rick: "richard",
  rich: "richard",
  ed: "edward",
  eddie: "edward",
  ted: "theodore",
  theo: "theodore",
  jim: "james",
  jimmy: "james",
  jamie: "james",
};

export function normalizePersonName(name: string | null | undefined): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function canonicalNicknameKey(fullName: string | null | undefined): string {
  const normalized = normalizePersonName(fullName);
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length < 2) return normalized;
  const first = NICKNAME_CANONICAL[parts[0]] || parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last}`;
}

function normEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

function normDob(dob: string | null | undefined): string {
  return (dob || "").trim();
}

/**
 * Returns true if two person records with the same normalized name can be
 * auto-merged without risking merging two different individuals (such as
 * a parent/child or two different-age students sharing a name).
 */
export function arePeopleSafeToAutoMerge(
  a: Pick<MergeablePersonRecord, "email" | "dateOfBirth">,
  b: Pick<MergeablePersonRecord, "email" | "dateOfBirth">
): boolean {
  const dobA = normDob(a.dateOfBirth);
  const dobB = normDob(b.dateOfBirth);
  if (dobA && dobB && dobA !== dobB) {
    return false;
  }

  const emailA = normEmail(a.email);
  const emailB = normEmail(b.email);
  if (emailA && emailB && emailA !== emailB) {
    // Only safe if both share the exact same non-empty DOB (e.g. personal vs work email)
    return Boolean(dobA && dobB && dobA === dobB);
  }

  return true;
}

const ADMIN_OR_STAFF_ROLES = new Set([
  "admin",
  "executive director",
  "business manager",
  "director",
  "staff",
  "production coordinator",
  "education coordinator",
]);

function scoreWinner(p: MergeablePersonRecord): number {
  let score = 0;
  if (p.hasPassword || p.passwordHash) score += 100_000;
  if ((p.roles || []).some((r) => ADMIN_OR_STAFF_ROLES.has(r.toLowerCase()))) score += 10_000;
  score += (p.creditsCount || 0) * 50;
  if (p.externalUserId) score += 300;
  if (p.dateOfBirth) score += 200;
  if (p.headshotUrl) score += 150;
  if (p.email) score += 100;
  return score;
}

export function pickWinningPerson<T extends MergeablePersonRecord>(candidates: T[]): T {
  const sorted = [...candidates].sort((a, b) => {
    const diff = scoreWinner(b) - scoreWinner(a);
    if (diff !== 0) return diff;
    return a.id - b.id;
  });
  return sorted[0];
}

/**
 * Computes the non-destructive field updates to apply to `winner` when
 * absorbing `loser`. Existing non-empty fields on `winner` are preserved.
 */
export function buildMergedPersonFields(
  winner: MergeablePersonRecord,
  loser: MergeablePersonRecord
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  const scalarKeys = [
    "email",
    "secondaryEmail",
    "familyEmail",
    "phone",
    "dateOfBirth",
    "gender",
    "headshotUrl",
    "heightInches",
    "editedBio",
    "address",
    "city",
    "state",
    "zipcode",
    "medicalNotes",
    "emergencyContactName",
    "emergencyContactPhone",
    "school",
    "tShirtSize",
    "externalUserId",
    "externalFamilyAccount",
    "familyId",
  ] as const;

  for (const key of scalarKeys) {
    const wVal = winner[key];
    const lVal = loser[key];
    const wEmpty = wVal === null || wVal === undefined || wVal === "";
    const lPresent = lVal !== null && lVal !== undefined && lVal !== "";
    if (wEmpty && lPresent) {
      updates[key] = lVal;
    }
  }

  // If loser has a different email and winner has no secondaryEmail, keep it as secondaryEmail
  const wEmail = normEmail(winner.email);
  const lEmail = normEmail(loser.email);
  if (wEmail && lEmail && wEmail !== lEmail && !winner.secondaryEmail && !updates.secondaryEmail) {
    updates.secondaryEmail = loser.email;
  }

  // Union roles cleanly
  const mergedRoles = Array.from(new Set([...(winner.roles || []), ...(loser.roles || [])])).filter(
    Boolean
  );
  if (
    mergedRoles.length !== (winner.roles || []).length ||
    mergedRoles.some((r, idx) => r !== (winner.roles || [])[idx])
  ) {
    updates.roles = mergedRoles;
  }

  return updates;
}
