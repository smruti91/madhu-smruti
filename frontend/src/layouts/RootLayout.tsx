import { NavLink, Outlet } from "react-router-dom";
import { BookHeart } from "lucide-react";
import { APP_NAME, APP_NAME_ODIA, ORGANIZATION } from "../config/constants";

/**
 * Root layout: header with navigation, routed content, footer.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <NavLink to="/" className="flex items-center gap-2">
            <BookHeart className="h-6 w-6 text-sky-600" aria-hidden="true" />
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-bold">{APP_NAME}</span>
              <span className="text-xs text-slate-500">
                {APP_NAME_ODIA} · {ORGANIZATION}
              </span>
            </span>
          </NavLink>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-medium transition-colors ${
                  isActive
                    ? "bg-sky-100 text-sky-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              Home
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {ORGANIZATION} · {APP_NAME} ({APP_NAME_ODIA})
        </div>
      </footer>
    </div>
  );
}
