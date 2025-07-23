import { createCookieSessionStorage } from "@remix-run/node";

const sessionSecret = process.env.SESSION_SECRET || "DEFAULT_SECRET_FOR_DEVELOPMENT";

export const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "remix_session",
    secrets: [sessionSecret],
    path: "/",
    httpOnly: true,
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    domain: process.env.NODE_ENV === "production" ? ".smartpicker.au" : undefined,
    sameSite: "lax", 
    secure: process.env.NODE_ENV === "production",
  },
});
