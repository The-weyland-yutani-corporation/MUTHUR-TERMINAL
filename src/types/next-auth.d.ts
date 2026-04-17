import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null;
      githubId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string | null;
    githubId?: string | null;
  }
}
