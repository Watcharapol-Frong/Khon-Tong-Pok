import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * These are cheap and they close real gaps, but note what they are NOT: none of
 * them protect data. The access controls that do that live in
 * `src/lib/auth.ts`. These only make the browser a less useful tool for
 * attacking a session that already exists.
 *
 * No Content-Security-Policy here on purpose. A CSP strict enough to be worth
 * having needs per-request nonces threaded through the app, and a CSP loose
 * enough to add safely in one sitting ('unsafe-inline' for Next's hydration
 * scripts) mostly provides the appearance of protection. Better to ship the
 * headers that work than a directive that reads well in a slide.
 */
const securityHeaders = [
  {
    // A candidate's session cookie is SameSite=Lax, which stops the cookie
    // riding along on cross-site POSTs but not on a framed GET. Refusing to be
    // framed at all removes clickjacking — an invisible iframe of /profile
    // overlaid on a "click here" button — as a way to act as a signed-in user.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Stops the browser second-guessing our Content-Type. Matters because
    // candidates upload resumes: a PDF that a sniffing browser decides is
    // HTML would run as HTML, on our origin, with our cookies.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Full URLs leak to third parties through the Referer header on every
    // outbound link. Paths here contain candidate ids
    // (/company/candidates/[id]), so send the origin only when leaving the site.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // The mic is needed for voice input, so `self` rather than a blanket deny.
    // Camera, geolocation and payment are never used and are switched off, so a
    // compromised dependency can't quietly ask for them.
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
  },
  {
    // Tells browsers to reach this origin over HTTPS from now on, so a first
    // request typed as http:// can't be intercepted before the redirect.
    // Only meaningful in production, where the site is served over TLS.
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Everything, including API routes and the auth callback.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
