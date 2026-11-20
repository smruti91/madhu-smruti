import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Palette,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  adminLogout,
  adminMe,
  downloadSubmissionImage,
  exportSubmissionsCsv,
  getAdminSubmission,
  getDashboardStats,
  listAdminSubmissions,
  updateAdminSubmissionStatus,
} from "../api/admin";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { formatIndianMobile } from "../utils/phone";
import type {
  AdminLanguage,
  AdminListParams,
  AdminListResponse,
  AdminProfile,
  AdminStatus,
  AdminStatusPayload,
  AdminSubmissionDetail,
  AdminSubmissionItem,
  AdminSubmissionType,
  DashboardStats,
} from "../types/admin";

const PAGE_SIZE = 10;

type TabKey =
  | "all"
  | "writeups"
  | "paintings"
  | "drafts"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

interface Filters {
  contributorName: string;
  phone: string;
  designation: string;
  submissionType: "" | AdminSubmissionType;
  language: "" | AdminLanguage;
  status: "" | AdminStatus;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: Filters = {
  contributorName: "",
  phone: "",
  designation: "",
  submissionType: "",
  language: "",
  status: "",
  fromDate: "",
  toDate: "",
};

const TABS: Array<{ key: TabKey; label: string; filters: Partial<Filters> }> = [
  { key: "all", label: "All submissions", filters: {} },
  { key: "writeups", label: "Write-ups", filters: { submissionType: "writeup" } },
  { key: "paintings", label: "Paintings", filters: { submissionType: "painting" } },
  { key: "drafts", label: "Drafts", filters: { status: "draft" } },
  { key: "submitted", label: "Submitted", filters: { status: "submitted" } },
  { key: "under_review", label: "Under Review", filters: { status: "under_review" } },
  { key: "approved", label: "Approved", filters: { status: "approved" } },
  { key: "rejected", label: "Rejected", filters: { status: "rejected" } },
];

const STATUS_LABELS: Record<AdminStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_BADGE: Record<AdminStatus, string> = {
  draft: "bg-amber-100 text-amber-800 border-amber-300",
  submitted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  under_review: "bg-sky-100 text-sky-800 border-sky-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

const typeOptions = [
  { value: "", label: "All types" },
  { value: "writeup", label: "Write-ups" },
  { value: "painting", label: "Paintings" },
];
const languageOptions = [
  { value: "", label: "All languages" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "odia", label: "Odia" },
];
const statusOptions = [
  { value: "", label: "All statuses" },
  ...TABS.filter((t) => ["drafts", "submitted", "under_review", "approved", "rejected"].includes(t.key)).map((t) => ({
    value: t.filters.status as string,
    label: t.label,
  })),
];

function buildParams(filters: Filters): Partial<AdminListParams> {
  return {
    ...(filters.contributorName.trim() ? { contributorName: filters.contributorName.trim() } : {}),
    ...(filters.phone.trim() ? { phone: filters.phone.trim() } : {}),
    ...(filters.designation.trim() ? { designation: filters.designation.trim() } : {}),
    ...(filters.submissionType ? { submissionType: filters.submissionType } : {}),
    ...(filters.language ? { language: filters.language } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
    ...(filters.toDate ? { toDate: filters.toDate } : {}),
  };
}

/**
 * Authenticated editorial dashboard. Statistics, submission lists and review
 * data all come from real admin APIs; the list is always server-paginated.
 */
export function AdminDashboardPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [list, setList] = useState<AdminListResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Partial<AdminListParams>>({});
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<AdminSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [updating, setUpdating] = useState(false);

  // Guard: verify session before rendering anything.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await adminMe();
        if (!cancelled) setAdmin(profile);
      } catch {
        if (!cancelled) navigate("/admin/login", { replace: true });
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    getDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        /* the list still works; cards stay empty rather than blocking the page */
      });
    return () => {
      cancelled = true;
    };
  }, [admin]);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    listAdminSubmissions({ ...applied, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setList(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [admin, applied, page]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 3500);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const beginLoad = () => {
    setLoadingList(true);
    setError(null);
  };

  const selectTab = (tab: (typeof TABS)[number]) => {
    beginLoad();
    setActiveTab(tab.key);
    const next = { ...EMPTY_FILTERS, ...tab.filters };
    setFilters(next);
    setApplied(buildParams(next));
    setPage(1);
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    beginLoad();
    setApplied(buildParams(filters));
    setPage(1);
  };

  const clearFilters = () => {
    beginLoad();
    setFilters(EMPTY_FILTERS);
    setApplied({});
    setPage(1);
    setActiveTab("all");
  };

  const goToPage = (nextPage: number) => {
    beginLoad();
    setPage(nextPage);
  };

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // Clear local state even if the server call fails.
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  const openDetail = async (submissionId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setRemarks("");
    try {
      const data = await getAdminSubmission(submissionId);
      setDetail(data);
    } catch (err) {
      setDetailError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (status: AdminStatus) => {
    if (!detail || updating) return;
    setUpdating(true);
    setDetailError(null);
    const payload: AdminStatusPayload = {
      status,
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    };
    try {
      const updated = await updateAdminSubmissionStatus(detail.id, payload);
      setDetail(updated);
      setRemarks("");
      setFlash(`Status updated to ${STATUS_LABELS[status]}.`);
      // Refresh both stats and the current page so counts stay accurate.
      setStats(await getDashboardStats());
      setList(await listAdminSubmissions({ ...applied, page, limit: PAGE_SIZE }));
    } catch (err) {
      setDetailError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportSubmissionsCsv(applied);
    } catch (err) {
      setFlash((err as Error).message);
    }
  };

  if (!authChecked) {
    return (
      <div className="py-20">
        <Spinner label="Verifying administrator session…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold-600">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Editorial workspace
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-maroon-800">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Signed in as <strong className="text-ink-700">{admin?.name}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button variant="ghost" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </header>

      {flash ? (
        <div className="rounded-lg border border-leaf-200 bg-leaf-100 px-4 py-3 text-sm text-leaf-700">
          <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
          {flash}
        </div>
      ) : null}

      {/* Statistics */}
      <section aria-label="Dashboard statistics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Contributors" value={stats?.totalContributors} tone="maroon" icon={<Users />} />
          <StatCard label="Write-ups" value={stats?.byType.writeup} tone="maroon" icon={<FileText />} />
          <StatCard label="Paintings" value={stats?.byType.painting} tone="gold" icon={<Palette />} />
          <StatCard label="Drafts" value={stats?.totalDrafts ?? stats?.byStatus.draft} tone="amber" icon={<Clock3 />} />
          <StatCard label="Final submissions" value={stats?.totalFinalSubmissions} tone="leaf" icon={<CheckCircle2 />} />
          <StatCard label="Pending reviews" value={stats?.pendingReviews ?? stats?.byStatus.under_review} tone="sky" icon={<Eye />} />
          <StatCard label="Approved" value={stats?.byStatus.approved} tone="green" icon={<CheckCircle2 />} />
          <StatCard label="Rejected" value={stats?.byStatus.rejected} tone="red" icon={<AlertCircle />} />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gold-200" role="tablist" aria-label="Submission views">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => selectTab(tab)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-maroon-600 text-maroon-800"
                : "border-transparent text-ink-500 hover:text-maroon-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <form onSubmit={applyFilters} className="rounded-xl border border-gold-200 bg-cream-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Contributor name"
            value={filters.contributorName}
            onChange={(e) => setFilters({ ...filters, contributorName: e.target.value })}
            placeholder="Search by name"
          />
          <Input
            label="Mobile number"
            value={filters.phone}
            onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
            placeholder="e.g. 98765"
          />
          <Input
            label="Designation"
            value={filters.designation}
            onChange={(e) => setFilters({ ...filters, designation: e.target.value })}
            placeholder="e.g. Teacher"
          />
          <Select
            label="Submission type"
            value={filters.submissionType}
            onChange={(e) => setFilters({ ...filters, submissionType: e.target.value as Filters["submissionType"] })}
            options={typeOptions}
          />
          <Select
            label="Language"
            value={filters.language}
            onChange={(e) => setFilters({ ...filters, language: e.target.value as Filters["language"] })}
            options={languageOptions}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters["status"] })}
            options={statusOptions}
          />
          <Input
            label="From date"
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
          />
          <Input
            label="To date"
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" disabled={loadingList}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Apply filters
          </Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Results */}
      <section className="overflow-hidden rounded-xl border border-gold-200 bg-white">
        <div className="flex items-center justify-between border-b border-gold-200 bg-cream-50 px-4 py-3">
          <h2 className="font-display font-semibold text-maroon-800">
            {TABS.find((t) => t.key === activeTab)?.label}
          </h2>
          <span className="text-sm text-ink-500">
            {list ? `${list.total} total` : "—"}
          </span>
        </div>

        {loadingList ? (
          <div className="py-16">
            <Spinner label="Loading submissions…" />
          </div>
        ) : list && list.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream-100 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title / Reference</th>
                    <th className="px-4 py-3 font-semibold">Contributor</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {list.items.map((item) => (
                    <SubmissionRow key={item.id} item={item} onReview={() => void openDetail(item.id)} />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              total={list.total}
              onPage={goToPage}
            />
          </>
        ) : (
          <div className="py-16 text-center">
            <LayoutDashboard className="mx-auto h-10 w-10 text-ink-300" aria-hidden="true" />
            <p className="mt-3 text-sm text-ink-500">No submissions match these filters.</p>
          </div>
        )}
      </section>

      {detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="rounded-xl bg-cream-50 p-8">
            <Spinner label="Opening submission…" />
          </div>
        </div>
      ) : null}

      {detail ? (
        <ReviewPanel
          detail={detail}
          remarks={remarks}
          onRemarks={setRemarks}
          onClose={() => setDetail(null)}
          onStatus={changeStatus}
          updating={updating}
          error={detailError}
          onDownload={(imageId, filename) => void downloadSubmissionImage(detail.id, imageId, filename)}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number | undefined;
  tone: "maroon" | "gold" | "amber" | "leaf" | "sky" | "green" | "red";
  icon: React.ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    maroon: "border-maroon-200 bg-maroon-100 text-maroon-700",
    gold: "border-gold-300 bg-gold-100 text-gold-700",
    amber: "border-amber-200 bg-amber-100 text-amber-700",
    leaf: "border-leaf-200 bg-leaf-100 text-leaf-700",
    sky: "border-sky-200 bg-sky-100 text-sky-700",
    green: "border-green-200 bg-green-100 text-green-700",
    red: "border-red-200 bg-red-100 text-red-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl font-bold tabular-nums">
          {value ?? "—"}
        </span>
        <span className="opacity-70 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function SubmissionRow({ item, onReview }: { item: AdminSubmissionItem; onReview: () => void }) {
  const date = item.submittedAt ?? item.updatedAt ?? item.createdAt;
  return (
    <tr className="hover:bg-cream-50">
      <td className="px-4 py-3">
        <p className="font-medium text-ink-900">{item.title}</p>
        <p className="mt-0.5 font-mono text-xs text-ink-400">{item.referenceNumber}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-ink-700">{item.contributorName}</p>
        <p className="mt-0.5 text-xs text-ink-400">
          {formatIndianMobile(item.contributorPhone)}
          {item.contributorDesignation ? ` · ${item.contributorDesignation}` : ""}
        </p>
      </td>
      <td className="px-4 py-3 text-ink-600">
        <span className="inline-flex items-center gap-1">
          {item.submissionType === "writeup" ? (
            <FileText className="h-4 w-4 text-maroon-500" aria-hidden="true" />
          ) : (
            <Palette className="h-4 w-4 text-gold-600" aria-hidden="true" />
          )}
          {item.submissionType === "writeup" ? "Write-up" : "Painting"}
        </span>
      </td>
      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
      <td className="px-4 py-3 text-xs text-ink-500">
        {new Date(date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onReview}
          className="inline-flex items-center gap-1 rounded-lg border border-maroon-300 px-3 py-1.5 text-sm font-medium text-maroon-700 hover:bg-maroon-100"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          Review
        </button>
      </td>
    </tr>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-200 bg-cream-50 px-4 py-3">
      <p className="text-xs text-ink-500">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gold-300 px-3 py-1.5 text-sm text-maroon-700 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
        <span className="text-sm text-ink-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gold-300 px-3 py-1.5 text-sm text-maroon-700 disabled:opacity-40"
        >
          Next
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Full submission review: content, contributor, history and decisions. */
function ReviewPanel({
  detail,
  remarks,
  onRemarks,
  onClose,
  onStatus,
  updating,
  error,
  onDownload,
}: {
  detail: AdminSubmissionDetail;
  remarks: string;
  onRemarks: (value: string) => void;
  onClose: () => void;
  onStatus: (status: AdminStatus) => void;
  updating: boolean;
  error: string | null;
  onDownload: (imageId: string, filename?: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Review submission"
    >
      <div className="w-full max-w-4xl rounded-xl border border-gold-300 bg-cream-50 shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gold-200 bg-cream-50 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <span className="font-mono text-xs text-ink-400">{detail.referenceNumber}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-maroon-800">{detail.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
            aria-label="Close review"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Contributor */}
          <section className="rounded-lg border border-gold-200 bg-white p-4">
            <h3 className="font-display font-semibold text-maroon-800">Contributor</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-400">Name</dt>
                <dd className="font-medium text-ink-700">{detail.contributor.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Mobile</dt>
                <dd className="font-medium text-ink-700">{formatIndianMobile(detail.contributor.phone)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Designation</dt>
                <dd className="font-medium text-ink-700">{detail.contributor.designation || "—"}</dd>
              </div>
            </dl>
          </section>

          {/* Content */}
          {detail.writeup ? (
            <section className="rounded-lg border border-gold-200 bg-white p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-cream-200 pb-3">
                {detail.subtitle ? <p className="text-ink-500">{detail.subtitle}</p> : null}
                {detail.category ? (
                  <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-medium text-gold-800">
                    {detail.category}
                  </span>
                ) : null}
                <span className="ml-auto text-xs capitalize text-ink-400">{detail.language}</span>
              </div>
              {/* Server-sanitized HTML preserves Odia/Hindi text and inline image positions. */}
              <div
                className="article-render"
                dangerouslySetInnerHTML={{ __html: detail.writeup.htmlContent }}
              />
            </section>
          ) : null}

          {detail.images && detail.images.length > 0 ? (
            <section className="rounded-lg border border-gold-200 bg-white p-6">
              <h3 className="font-display font-semibold text-maroon-800">Paintings</h3>
              {detail.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600">{detail.description}</p>
              ) : null}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {detail.images.map((image, index) => (
                  <figure key={image.id} className="overflow-hidden rounded-xl border border-gold-200 bg-cream-100">
                    <img
                      src={image.imageUrl}
                      alt={image.caption || `Painting ${index + 1}`}
                      className="max-h-96 w-full object-contain"
                    />
                    <figcaption className="flex items-center justify-between gap-2 p-3">
                      <span className="text-sm text-ink-600">{image.caption || `Image ${index + 1}`}</span>
                      <button
                        type="button"
                        onClick={() => onDownload(image.id, `painting-${index + 1}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gold-300 px-2.5 py-1 text-xs font-medium text-maroon-700 hover:bg-gold-100"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Download
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {/* History */}
          <section className="rounded-lg border border-gold-200 bg-white p-4">
            <h3 className="font-display font-semibold text-maroon-800">History</h3>
            {detail.history.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {detail.history.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                    <div>
                      <p className="font-medium capitalize text-ink-700">
                        {entry.action.replace(/_/g, " ")}
                        <span className="ml-2 font-normal text-ink-400">by {entry.changedBy}</span>
                      </p>
                      {entry.remarks ? (
                        <p className="text-ink-500">{entry.remarks}</p>
                      ) : null}
                      <p className="text-xs text-ink-400">
                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-ink-400">No history entries.</p>
            )}
          </section>

          {/* Decision */}
          <section className="rounded-lg border border-gold-300 bg-cream-100 p-4">
            <h3 className="font-display font-semibold text-maroon-800">Editorial decision</h3>
            <label htmlFor="admin-remarks" className="mt-3 block text-sm font-medium text-ink-700">
              Remarks (optional)
            </label>
            <textarea
              id="admin-remarks"
              value={remarks}
              onChange={(e) => onRemarks(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Add a note for the contributor or editorial team…"
              className="mt-1 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-400 focus:outline-none"
            />
            {error ? (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={updating}
                onClick={() => onStatus("approved")}
                className="bg-leaf-600 hover:bg-leaf-700"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={updating}
                onClick={() => onStatus("under_review")}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Mark under review
              </Button>
              <Button
                disabled={updating}
                onClick={() => onStatus("rejected")}
                className="bg-red-700 hover:bg-red-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Reject
              </Button>
              {detail.status !== "draft" ? (
                <Button variant="ghost" disabled={updating} onClick={() => onStatus("draft")}>
                  Reopen as draft
                </Button>
              ) : null}
              {updating ? <Spinner size="sm" /> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
