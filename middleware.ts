import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Payment protection is handled at route level via withX402() to keep
// this Edge bundle under Vercel's 1 MB limit (x402-next is too large for Edge).
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
