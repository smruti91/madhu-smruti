import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  FileWarning,
  Link2Off,
  Palette,
  PenLine,
  Send,
  ShieldX,
} from "lucide-react";
import { getSubmission } from "../api/submissions";
import { Spinner } from "../components/ui/Spinner";
import { LinkButton } from "../components/ui/LinkButton";
import { formatIndianMobile } from "../utils/phone";
import type { SubmissionDetail } from "../types/submission";

const statusCopy: Record<string, string> = {
  draft: "Draft — still editable by you",
  submitted: "Finalized — awaiting editorial review",
  under_review: "Under editorial review",
  approved: "Approved for publication",
  rejected: "Not accepted this time",
};

/**
 * Private resume page — the target of the resume link issued after draft
 * creation. The access credential travels in the ?token= query parameter;
 * without it nothing is revealed beyond a generic error.
 */
export function ResumePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id && token));
  const [error, setError] = useState<string | null>(
    !id ? "Submission not found." : !token ? "missing-token" : null
  );

  useEffect(() => {
    if (!id || !token) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await getSubmission(id, token);
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setError("invalid-token");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (loading) {
    return (
      <div className="py-16">
        <Spinner label="Opening your submission…" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <FailureCard
        icon={error === "missing-token" ? Link2Off : ShieldX}
        title="This is a private link"
        message={
          error === "missing-token"
            ? "This resume link is missing its access credential. Use the exact link you received when you created your draft."
            : "The access credential in this link is invalid, or the draft it points to no longer exists."
        }
      />
    );
  }

  const isDraft = detail.status === "draft";
  const TypeIcon = detail.submissionType === "writeup" ? PenLine : Palette;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-600">
          Your private submission
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-maroon-800">
          {detail.title}
        </h1>
        <p className="mt-1 font-mono text-sm text-ink-500">{detail.referenceNumber}</p>
      </header>

      {/* Status */}
      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${
          isDraft
            ? "border-leaf-200 bg-leaf-100 text-leaf-700"
            : "border-gold-300 bg-gold-100 text-ink-700"
        }`}
      >
        {isDraft ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        <p className="text-sm font-medium">{statusCopy[detail.status] ?? detail.status}</p>
      </div>

      {/* Summary */}
      <section className="rounded-xl border border-gold-300 bg-cream-50 p-6">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-400">Type</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-ink-700">
              <TypeIcon className="h-4 w-4 text-maroon-600" aria-hidden="true" />
              {detail.submissionType === "writeup" ? "Write Up (ଲେଖା)" : "Painting (ଚିତ୍ର)"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-400">Language</dt>
            <dd className="mt-0.5 font-medium capitalize text-ink-700">{detail.language}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Contributor</dt>
            <dd className="mt-0.5 font-medium text-ink-700">
              {detail.contributor.name} · {formatIndianMobile(detail.contributor.phone)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-400">Last updated</dt>
            <dd className="mt-0.5 font-medium text-ink-700">
              {new Date(detail.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </section>

      {/* Content preview */}
      {detail.writeup ? (
        <section className="rounded-xl border border-gold-300 bg-cream-50 p-6">
          <h2 className="font-display text-lg font-bold text-maroon-800">Your write-up</h2>
          <div
            className="prose prose-sm mt-3 max-w-none"
            dangerouslySetInnerHTML={{ __html: detail.writeup.htmlContent }}
          />
        </section>
      ) : null}

      {detail.images?.length ? (
        <section className="rounded-xl border border-gold-300 bg-cream-50 p-6">
          <h2 className="font-display text-lg font-bold text-maroon-800">Your painting</h2>
          <img
            src={detail.images[0].imageUrl}
            alt={detail.images[0].caption ?? "Painting"}
            className="mt-3 max-h-96 w-full rounded-lg object-contain"
          />
          {detail.images[0].caption ? (
            <p className="mt-2 text-center text-sm text-ink-500">{detail.images[0].caption}</p>
          ) : null}
        </section>
      ) : null}

      {/* Actions */}
      {isDraft ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gold-300 bg-cream-50 p-6 sm:flex-row sm:justify-between">
          <p className="text-sm text-ink-500">This draft can still be edited.</p>
          <LinkButton
            to={`/submit?draft=${detail.id}&token=${encodeURIComponent(token!)}`}
            variant="primary"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Continue editing
          </LinkButton>
        </div>
      ) : (
        <div className="rounded-xl border border-gold-300 bg-cream-50 p-6 text-center">
          <FileWarning className="mx-auto h-6 w-6 text-gold-600" aria-hidden="true" />
          <p className="mt-2 text-sm text-ink-500">
            Finalized submissions are locked for editing. Contact the MDRAFM
            editorial team if a change is needed.
          </p>
        </div>
      )}

      <p className="text-center">
        <Link
          to="/"
          className="text-sm font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4"
        >
          Back to the magazine
        </Link>
      </p>
    </div>
  );
}

function FailureCard({
  icon: Icon,
  title,
  message,
}: {
  icon: typeof ShieldX;
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />
      <h1 className="mt-4 font-display text-2xl font-bold text-red-800">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-red-700">{message}</p>
      <Link
        to="/"
        className="mt-6 inline-block text-sm font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4"
      >
        Back to the magazine
      </Link>
    </div>
  );
}
