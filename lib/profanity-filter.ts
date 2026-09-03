// A lightweight, client-side pre-check for common profanity — catches
// obviously abusive input before it's ever sent to the API, so a bad-faith
// message costs zero tokens instead of a full round trip. Not a
// moderation-grade system: it covers common English cursing only,
// word-boundary matched at the START only (so "fucking"/"shitty"/"dickhead"
// still match on their root) but never mid-word (so "class"/"assassin" don't
// falsely trip on "ass"). Anything subtler than outright cursing is left to
// the AI's own system-prompt instruction to de-escalate calmly rather than
// engage.

const COMMON_PROFANITY = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "piss off",
  "cunt",
  "whore",
  "slut",
  "motherfucker",
  "dumbass",
  "jackass",
];

const PATTERN = new RegExp(`\\b(${COMMON_PROFANITY.map((w) => w.replace(/\s+/g, "\\s+")).join("|")})\\w*`, "i");

export function containsProfanity(text: string): boolean {
  return PATTERN.test(text);
}
