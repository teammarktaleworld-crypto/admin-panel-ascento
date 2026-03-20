import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/constants";

const protectedPaths = [
  "/dashboard",
  "/domains",
  "/classes",
  "/sections",
  "/subjects",
  "/teachers",
  "/students",
  "/academic-years",
  "/exams",
  "/fees",
  "/timetable",
  "/notifications",
  "/enquiries",
  "/settings",
];

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  const isLoginPath = pathname === "/login";
  const isProtectedPage = protectedPaths.some((path) => pathname.startsWith(path));

  if (!token && isProtectedPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isLoginPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/domains/:path*",
    "/classes/:path*",
    "/sections/:path*",
    "/subjects/:path*",
    "/teachers/:path*",
    "/students/:path*",
    "/academic-years/:path*",
    "/exams/:path*",
    "/fees/:path*",
    "/timetable/:path*",
    "/notifications/:path*",
    "/enquiries/:path*",
    "/settings/:path*",
  ],
};
