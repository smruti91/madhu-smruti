import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Phone,
  FileText,
  Palette,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  User,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import {
  getTrackedSubmission,
  searchSubmissionsByPhone,
} from "../api/submissions";
import { formatIndianMobile, normalizeIndianMobile } from "../utils/phone";
import type {
  SubmissionDetail,
  SubmissionSearchResult,
} from "../types/submission";

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
 * Contributors enter their Indian mobile number to find their write-ups and
 * paintings. Clicking a result opens a read-only view automatically - no token
 * is needed to VIEW. Editing still requires the private edit token through the
 * original resume link, which is never exposed by this page.
 */
export function SearchArticlePage() {
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [results, setResults] = useState<SubmissionSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResults(null);
    setPhoneError(null);
    setDetail(null);

    const normalized = normalizeIndianMobile(phone);
    if (!normalized) {
      setPhoneError("Enter a valid Indian mobile number (10 digits, starting 6-9)");
      return;
    }

    setLoading(true);
    try {
      const submissions = await searchSubmissionsByPhone(normalized);
      setNormalizedPhone(normalized);
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
    setDetail(null);
  };

  const openArticle = async (submissionId: string) => {
    if (!normalizedPhone) return;
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await getTrackedSubmission(submissionId, normalizedPhone);
      setDetail(data);
    } catch (err) {
      setDetailError((err as Error).message || "Could not open this article.");
    } finally {
      setDetailLoading(false);
    }
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
          <p className="text-xs text-ink-400">Click any article to view it.</p>
          <div className="space-y-3" role="list">
            {results.map((submission) => (
              <ArticleCard
                key={submission.id}
                submission={submission}
                onOpen={() => void openArticle(submission.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-center text-xs text-ink-400">
        Need help? Contact the MDRAFM editorial team. To edit a draft, use the
        private resume link you received when you created it.
      </p>

      {detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="rounded-xl bg-cream-50 p-8">
            <Spinner label="Opening article…" />
          </div>
        </div>
      ) : null}

      {detailError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700" role="alert">
          {detailError}
        </div>
      ) : null}

      {detail ? <ArticleView detail={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function ArticleCard({
  submission,
  onOpen,
}: {
  submission: SubmissionSearchResult;
  onOpen: () => void;
}) {
  const isDraft = submission.status === "draft";
  const displayDate = new Date(
    submission.submittedAt ?? submission.updatedAt ?? submission.createdAt
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      role="listitem"
      className="block w-full rounded-xl border border-gold-200 bg-white p-5 text-left shadow-sm transition-all hover:border-gold-400 hover:shadow-md focus:outline-2 focus:outline-offset-2 focus:outline-gold-500"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
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
        </div>
        <span className="shrink-0 text-sm font-medium text-maroon-700">
          View article →
        </span>
      </div>
    </button>
  );
}

/** Read-only article view opened automatically when a result is clicked. */
function ArticleView({
  detail,
  onClose,
}: {
  detail: SubmissionDetail;
  onClose: () => void;
}) {
  const isDraft = detail.status === "draft";
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Article details"
    >
      <div className="w-full max-w-3xl rounded-xl border border-gold-300 bg-cream-50 shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gold-200 bg-cream-50 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  STATUS_STYLES[detail.status] ?? STATUS_STYLES.draft
                }`}
              >
                {STATUS_LABELS[detail.status] ?? detail.status}
              </span>
              <span className="font-mono text-xs text-ink-400">
                {detail.referenceNumber}
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-maroon-800">
              {detail.title}
            </h2>
            {detail.subtitle ? (
              <p className="mt-1 text-sm text-ink-500">{detail.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
            aria-label="Close article"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <section className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg border border-gold-200 bg-white p-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gold-600" aria-hidden="true" />
              <span className="text-ink-700">{detail.contributor.name}</span>
              {detail.contributor.designation ? (
                <span className="text-ink-400">· {detail.contributor.designation}</span>
              ) : null}
            </div>
            <div className="text-ink-500">
              {formatIndianMobile(detail.contributor.phone)}
            </div>
            <div className="text-ink-500 capitalize">{detail.language}</div>
            <div className="text-ink-400">
              Updated {new Date(detail.updatedAt).toLocaleDateString("en-IN")}
            </div>
          </section>

          {detail.writeup ? (
            <section className="rounded-lg border border-gold-200 bg-white p-6">
              {detail.category ? (
                <span className="mb-4 inline-block rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-medium text-gold-800">
                  {detail.category}
                </span>
              ) : null}
              <div
                className="article-render"
                dangerouslySetInnerHTML={{ __html: detail.writeup.htmlContent }}
              />
            </section>
          ) : null}

          {detail.images && detail.images.length > 0 ? (
            <section className="rounded-lg border border-gold-200 bg-white p-6">
              {detail.description ? (
                <p className="mb-4 whitespace-pre-wrap text-sm text-ink-600">
                  {detail.description}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {detail.images.map((image, index) => (
                  <figure
                    key={image.id}
                    className="overflow-hidden rounded-xl border border-gold-200 bg-cream-100"
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.caption || `Painting image ${index + 1}`}
                      className="max-h-96 w-full object-contain"
                    />
                    {image.caption ? (
                      <figcaption className="p-3 text-center text-sm italic text-ink-500">
                        {image.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {isDraft ? (
            <p className="rounded-lg border border-gold-200 bg-cream-100 p-4 text-center text-sm text-ink-500">
              This article is still a draft. To edit it, use the private resume link
              you received when you created it.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
