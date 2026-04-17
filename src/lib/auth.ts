import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb, isDatabaseConfigured } from "@/db";
import * as schema from "@/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth(() => {
  // If database is not configured, return a minimal config (anonymous mode)
  if (!isDatabaseConfigured()) {
    return {
      providers: [],
      adapter: undefined,
      session: { strategy: "jwt" },
    };
  }

  const db = getDb();

  return {
    adapter: DrizzleAdapter(db, {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      sessionsTable: schema.authSessions,
      verificationTokensTable: schema.verificationTokens,
    }),
    providers: [
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        profile(profile) {
          return {
            id: profile.id.toString(),
            name: profile.name ?? profile.login,
            email: profile.email,
            image: profile.avatar_url,
            githubId: profile.id.toString(),
            username: profile.login,
          };
        },
      }),
    ],
    callbacks: {
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
          // Add custom fields from our schema
          const dbUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, user.id),
          });
          if (dbUser) {
            session.user.username = dbUser.username;
            session.user.githubId = dbUser.githubId;
          }
        }
        return session;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
  };
});
