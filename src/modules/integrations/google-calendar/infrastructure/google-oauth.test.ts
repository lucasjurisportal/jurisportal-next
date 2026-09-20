import test from "node:test";
import assert from "node:assert/strict";
import { buildGoogleAuthorizationUrl, GOOGLE_CALENDAR_SCOPE } from "./google-oauth";

test("URL OAuth usa callback, escopo mínimo, offline e state", () => {
  const previous = {
    id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirect: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  };
  process.env.GOOGLE_CALENDAR_CLIENT_ID = "client-test";
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "secret-test";
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = "http://localhost:3000/api/integrations/google-calendar/callback";
  try {
    const url = new URL(buildGoogleAuthorizationUrl("state-test"));
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.searchParams.get("client_id"), "client-test");
    assert.equal(url.searchParams.get("redirect_uri"), process.env.GOOGLE_CALENDAR_REDIRECT_URI);
    assert.equal(url.searchParams.get("scope"), GOOGLE_CALENDAR_SCOPE);
    assert.equal(url.searchParams.get("access_type"), "offline");
    assert.equal(url.searchParams.get("prompt"), "consent");
    assert.equal(url.searchParams.get("state"), "state-test");
  } finally {
    if (previous.id === undefined) delete process.env.GOOGLE_CALENDAR_CLIENT_ID; else process.env.GOOGLE_CALENDAR_CLIENT_ID = previous.id;
    if (previous.secret === undefined) delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET; else process.env.GOOGLE_CALENDAR_CLIENT_SECRET = previous.secret;
    if (previous.redirect === undefined) delete process.env.GOOGLE_CALENDAR_REDIRECT_URI; else process.env.GOOGLE_CALENDAR_REDIRECT_URI = previous.redirect;
  }
});
