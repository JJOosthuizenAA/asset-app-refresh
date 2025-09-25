// src/app/signout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
 // Clear the demo session cookie and send user to /signin
 const res = NextResponse.redirect(new URL("/signin", "http://localhost:3000"));
 res.cookies.set("session", "", { path: "/", maxAge: 0 });
 return res;
}
