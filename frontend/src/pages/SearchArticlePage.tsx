import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Phone,
  FileText,
  Palette,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { searchSubmissionsByPhone } from "../api/submissions";
import { normalizeIndianMobile } from "../utils/phone";
import type { SubmissionSearchResult } from "../types/submission";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 border-amber-300",
  submitted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  under_review: "bg-sky-100 text-sky-800 border-sky-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

/**
 * Search Article by Phone Number page.
 *
 * Contributors enter their Indian mobile number to find all their write-ups
 * and paintings. Results show status badges (Draft / Submitted) and an action
 * to open the private submission using the edit token from their saved link.
 *
 * Phone number alone NEVER grants edit access: every result action requires
 * the private edit token, which is matched against a server-side hash.
 */
export function SearchArticlePage() {
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [results, setResults] = useState<SubmissionSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResults(null);
    setPhoneError(null);

    const normalized = normalizeIndianMobile(phone);
    if (!normalized) {
      setPhoneError("Enter a valid Indian mobile number (10 digits, starting 6-9)");
      return;
    }

    setLoading(true);
    try {
      const submissions = await searchSubmissionsByPhone(normalized);
      setResults(submissions);
    } catch (err) {
      setError((err as Error).message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneError(null);
    setError(null);
    setResults(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold text-maroon-800">
          Track Your Submission
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Enter the mobile number you used to submit. Find your write-ups and
          paintings and check whether they&apos;re still drafts or already submitted.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gold-300 bg-cream-50 p-6"
      >
        <Input
          label="Mobile number"
          type="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="e.g. 98765 43210 or +91 98765 43210"
          error={phoneError ?? undefined}
          autoComplete="tel"
          autoFocus
          disabled={loading}
          maxLength={20}
        />
        <p className="text-xs text-ink-400">
          We accept 10-digit numbers, +91 prefixes, and common separators.
        </p>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" />
              Searching…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" aria-hidden="true" />
              Search Articles
            </>
          )}
        </Button>
      </form>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center" role="alert">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" aria-hidden="true" />
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {results !== null && results.length === 0 ? (
        <div className="rounded-xl border border-gold-200 bg-cream-50 p-8 text-center">
          <Phone className="mx-auto h-12 w-12 text-ink-300" aria-hidden="true" />
          <h2 className="mt-4 font-display text-lg font-semibold text-maroon-700">
            No submissions found
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            We couldn&apos;t find any submissions for this phone number.
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Make sure you&apos;re using the same mobile number you submitted with, then try again.
          </p>
          <Link
            to="/submit"
            className="mt-4 inline-block text-sm font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4"
          >
            Submit a new contribution →
          </Link>
        </div>
      ) : null}

      {results !== null && results.length > 0 ? (
        <section className="space-y-4" aria-label="Search results">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-maroon-800">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold-100 text-sm font-bold text-gold-700">
              {results.length}
            </span>
            Submission{results.length !== 1 ? "s" : ""} found
          </h2>
          <div className="space-y-3" role="list">
            {results.map((submission) => (
              <ArticleCard key={submission.id} submission={submission} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-center text-xs text-ink-400">
        Need help? Contact the MDRAFM editorial team. Your private edit token is
        required to open a submission and is shown only once when you create it.
      </p>
    </div>
  );
}

function ArticleCard({ submission }: { submission: SubmissionSearchResult }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState("");

  const isDraft = submission.status === "draft";
  const displayDate = new Date(
    submission.submittedAt ?? submission.updatedAt ?? submission.createdAt
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const openSubmission = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) return;
    navigate(`/resume/${submission.id}?token=${encodeURIComponent(cleanToken)}`);
  };

  return (
    <article
      className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      role="listitem"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-maroon-600">
              {submission.submissionType === "writeup" ? (
                <FileText className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Palette className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display font-semibold text-maroon-800">
                {submission.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                <span className="font-mono">{submission.referenceNumber}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {displayDate}
                </span>
                <span className="capitalize">
                  {submission.submissionType === "writeup" ? "Write-up" : "Painting"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                STATUS_STYLES[submission.status] ?? STATUS_STYLES.draft
              }`}
            >
              {isDraft ? (
                <Clock className="h-3 w-3" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              )}
              {STATUS_LABELS[submission.status] ?? submission.status}
            </span>
            {submission.status === "approved" ? (
              <span className="text-xs font-medium text-green-700">Published</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold-300 bg-cream-50 px-3 py-2 text-sm font-medium text-maroon-700 hover:bg-gold-100"
            aria-expanded={expanded}
          >
            {isDraft ? (
              <Pencil className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {isDraft ? "Resume draft" : "View details"}
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {expanded ? (
        <form
          onSubmit={openSubmission}
          className="mt-4 border-t border-gold-200 pt-4"
        >
          <p className="mb-3 flex items-start gap-2 text-xs text-ink-500">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden="true" />
            <span>
              Enter the private edit token from your confirmation message to{" "}
              {isDraft ? "continue editing" : "view"} this submission. Phone number
              alone cannot open it.
            </span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your private edit token"
              className="min-w-0 flex-1 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-400 focus:outline-none"
              aria-label="Private edit token"
            />
            <Button type="submit" disabled={!token.trim()}>
              Open submission
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  );
}