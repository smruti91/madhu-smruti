import { NavLink, Outlet } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { APP_NAME, APP_NAME_ODIA, LOGO_URL, ORGANIZATION, ORGANIZATION_BLURB } from "../config/constants";
import { useHealth } from "../hooks/useHealth";
import { LotusDivider } from "../components/illustrations/artwork";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/submit", label: "Submit" },
  { to: "/track", label: "Track Article" },
];

/** Tiny live status dot for the footer (API health). */
function StatusLine() {
  const { data, loading, error } = useHealth();

  const state = loading
    ? { dot: "bg-gold-400", label: "Checking services…" }
    : error || data?.database === "error"
      ? { dot: "bg-red-400", label: "Some services are offline" }
      : { dot: "bg-leaf-400", label: "All services operational" };

  return (
    <p className="mt-3 flex items-center gap-2 text-xs text-cream-200/80">
      <span className={`h-2 w-2 rounded-full ${state.dot}`} aria-hidden="true" />
      {state.label}
    </p>
  );
}

/**
 * Root layout: editorial masthead header, routed content, magazine footer
 * with MDRAFM information and a discreet administrator login link.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      {/* thin gold foil rule */}
      <div className="h-1 bg-gradient-to-r from-maroon-800 via-gold-500 to-maroon-800" aria-hidden="true" />

      <header className="sticky top-0 z-40 border-b border-gold-200 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between sm:gap-6 sm:py-4">
          <NavLink to="/" className="group relative z-10 flex items-center" aria-label={`${APP_NAME} home`}>
            <img
              src={LOGO_URL}
              alt={`${APP_NAME} logo`}
              width={192}
              height={64}
              className="h-12 w-auto max-w-[220px] shrink-0 object-contain transition-opacity group-hover:opacity-90 sm:h-14"
            />
          </NavLink>

          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `border-b-2 px-4 py-2 font-display text-sm font-semibold tracking-wide transition-colors ${
                    isActive
                      ? "border-gold-500 text-maroon-800"
                      : "border-transparent text-ink-500 hover:border-gold-300 hover:text-maroon-700"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
        <Outlet />
      </main>

      <footer className="bg-maroon-900 text-cream-200">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-3">
            {/* Organization */}
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-gold-400">
                {ORGANIZATION}
              </h3>
              <LotusDivider className="mt-2 w-28 text-gold-600" />
              <p className="mt-3 text-sm leading-relaxed text-cream-200/80">
                {ORGANIZATION_BLURB}
              </p>
              <StatusLine />
            </div>

            {/* Contribute */}
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-gold-400">
                Contribute
              </h3>
              <LotusDivider className="mt-2 w-28 text-gold-600" />
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <NavLink to="/submit?type=writeup" className="text-cream-200/80 transition-colors hover:text-gold-300">
                    Write a tribute →
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/submit?type=painting" className="text-cream-200/80 transition-colors hover:text-gold-300">
                    Upload a painting →
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/#process" className="text-cream-200/80 transition-colors hover:text-gold-300">
                    How submissions work →
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/track" className="text-cream-200/80 transition-colors hover:text-gold-300">
                    Track your submission →
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Magazine */}
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-gold-400">
                {APP_NAME}
              </h3>
              <LotusDivider className="mt-2 w-28 text-gold-600" />
              <p className="text-odia mt-3 text-lg text-gold-300">{APP_NAME_ODIA}</p>
              <p className="mt-2 text-sm leading-relaxed text-cream-200/80">
                Published annually by {ORGANIZATION} in English, Hindi and Odia.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-maroon-700 pt-5 text-xs text-cream-200/60 sm:flex-row">
            <p>
              © {new Date().getFullYear()} {ORGANIZATION} · {APP_NAME} ({APP_NAME_ODIA})
            </p>
            {/* Discreet administrator access */}
            <NavLink
              to="/admin"
              className="inline-flex items-center gap-1 opacity-40 transition-opacity hover:text-gold-300 hover:opacity-90"
              title="Administrator login"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Administrator Login
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
