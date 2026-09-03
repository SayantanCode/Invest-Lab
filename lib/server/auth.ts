import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

import clientPromise, { getDb } from "@/lib/server/mongodb";
import connectToDatabase from "@/lib/server/mongoose";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { emailProvider } from "@/lib/server/auth-lookup";

// Thrown by authorize() when the email belongs to a Google-only account —
// its `code` survives to the client's signIn() result, so the UI can say
// "use Google" instead of a generic "wrong credentials" message. Every other
// authorize() failure (no account at all, or a genuine wrong password) stays
// a plain `null` on purpose: naming those specifically would let a login
// form be used to guess which emails are registered.
export class GoogleAccountError extends CredentialsSignin {
  code = "google_only";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        await connectToDatabase;
        const cred = await LocalCredentialModel.findOne({ email }).lean<{ userId: string; passwordHash: string }>();
        if (!cred) {
          if ((await emailProvider(email)) === "google") throw new GoogleAccountError();
          return null;
        }

        const valid = await bcrypt.compare(password, cred.passwordHash);
        if (!valid) return null;

        // The credential's userId points at a document in the adapter's own
        // native `users` collection (see verify-otp/route.ts, which creates
        // it in the exact shape the adapter uses for Google sign-ins) — so
        // session.user.id means the same thing regardless of login method.
        const db = await getDb();
        const user = await db.collection("users").findOne({ _id: new ObjectId(cred.userId) });
        if (!user) return null;

        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],
  // A Credentials provider forces JWT sessions — Auth.js throws
  // UnsupportedStrategy if paired with "database". The adapter above still
  // handles user/account persistence either way; only session *lookup*
  // moves from a DB round-trip to a signed/encrypted cookie.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // sliding renewal every 24h of activity
  },
  // Sends OAuth errors (e.g. OAuthAccountNotLinked, when a Google sign-in's
  // email already has a password-based account — Auth.js throws that itself,
  // no custom signIn callback needed) back into this app instead of Auth.js's
  // own unbranded error page. app/page.tsx reads the `?error=` param once on
  // mount and shows a proper toast.
  pages: {
    error: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        await connectToDatabase;
        token.hasPassword = !!(await LocalCredentialModel.findOne({ userId: user.id }).lean());
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.hasPassword = !!token.hasPassword;
      return session;
    },
  },
});
