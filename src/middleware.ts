export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/api/conversations/:path*", "/api/sessions/:path*"],
};
