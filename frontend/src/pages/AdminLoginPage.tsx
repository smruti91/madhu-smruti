import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { adminLogin, type AdminProfile } from "../api/admin";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { APP_NAME, APP_NAME_ODIA, ORGANIZATION } from "../config/constants";

/**
 * Administrator sign-in. Reached discreetly from the footer link.
 * Sets an HTTP-only session cookie on success.
 */
export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState<AdminProfile | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const admin = await adminLogin(email.trim(), password);
      setSignedInAs(admin);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-gold-300 bg-cream-50 p-8 shadow-sm">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold-400 bg-cream-200 text-maroon-700">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-maroon-800">
            Administrator Login
          </h1>
          <p className="text-odia mt-1 text-sm text-gold-600">
            {APP_NAME} · {APP_NAME_ODIA} — {ORGANIZATION}
          </p>
        </div>

        {signedInAs ? (
          <div className="mt-8 rounded-lg border border-leaf-200 bg-leaf-100 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-leaf-600" aria-hidden="true" />
            <p className="mt-3 font-display text-lg font-bold text-leaf-700">
              Welcome, {signedInAs.name}
            </p>
            <p className="mt-1 text-sm text-leaf-700">
              Your session is active. The editorial dashboard is on its way.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-maroon-800"
            >
              Back to the magazine
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mdrafm.org"
              required
              autoComplete="username"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-full">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
