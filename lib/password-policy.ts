// One password rule, shared by every place a password gets set (signup,
// forgot-password reset, change-password) and by the client-side forms that
// hint at it — so the rule can never drift between what the UI promises and
// what the server actually enforces.
//
// The strength rule (8+ chars, mixing character types) only applies in
// production. Locally, `next dev` runs with NODE_ENV=development, so this
// relaxes to "just type something" — testing sign-up/sign-in repeatedly
// shouldn't mean inventing and remembering a strong password every time.
// Next.js inlines process.env.NODE_ENV into the client bundle at build time
// (a special case, unlike other env vars), so this same check is accurate
// in both server routes and client components with no extra plumbing.

export const PASSWORD_MIN_LENGTH = 8;

export function isPasswordStrengthEnforced(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Empty array means the password is acceptable. */
export function getPasswordIssues(password: string): string[] {
  if (!isPasswordStrengthEnforced()) {
    return password.length > 0 ? [] : ["Password is required."];
  }
  const issues: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`At least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    issues.push("Mix at least 3 of: lowercase, uppercase, numbers, symbols.");
  }
  return issues;
}

/** Shown under a new-password field regardless of validity, so the rule is visible before someone types. */
export function passwordHint(): string {
  return isPasswordStrengthEnforced()
    ? `At least ${PASSWORD_MIN_LENGTH} characters, mixing at least 3 of: lowercase, uppercase, numbers, symbols.`
    : "Local testing — any password works.";
}
