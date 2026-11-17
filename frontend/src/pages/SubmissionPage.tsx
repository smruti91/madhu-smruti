import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  FileCheck2,
  ImagePlus,
  KeyRound,
  Link2,
  Loader2,
  Palette,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { WriteupEditor } from "../components/editor/WriteupEditor";
import {
  createSubmission,
  finalizeSubmission,
  getSubmission,
  updateSubmission,
} from "../api/submissions";
import { registerContributor } from "../api/contributors";
import { uploadImage } from "../api/uploads";
import {
  formatIndianMobile,
  normalizeIndianMobile,
} from "../utils/phone";
import type {
  CreateSubmissionPayload,
  SubmissionLanguage,
  SubmissionType,
  UpdateSubmissionPayload,
} from "../types/submission";

const EDIT_TOKENS_STORAGE_KEY = "madhu-smruti-edit-tokens";
const AUTOSAVE_DELAY_MS = 2000;

function persistEditToken(submissionId: string, editToken: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(EDIT_TOKENS_STORAGE_KEY) ?? "{}");
    stored[submissionId] = editToken;
    localStorage.setItem(EDIT_TOKENS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage unavailable - the token is still shown on screen
  }
}

function resumeLink(submissionId: string, token: string): string {
  return `${window.location.origin}/resume/${submissionId}?token=${encodeURIComponent(token)}`;
}

const languageOptions = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "odia", label: "ଓଡ଼ିଆ (Odia)" },
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ConfirmedResult {
  submissionId: string;
  referenceNumber: string;
  title: string;
  submissionType: SubmissionType;
  /** Only present right after creation - the token is never shown again. */
  editToken: string | null;
  /** True when the draft went through Final Submit (status = submitted). */
  finalized: boolean;
}

/**
 * Contributor details + draft submission workflow.
 *
 * Create mode: the contributor fills in details and content, then either
 * "Save Draft" (creates the draft and switches into edit mode with autosave
 * active) or "Final Submit" (creates the draft and immediately finalizes it).
 *
 * Edit mode (/submit?draft=<id>&token=<token>): loads an existing draft,
 * prefills everything, autosaves with a 2-second debounce, and offers
 * "Save Draft" (manual save with audit history) and "Final Submit".
 */
export function SubmissionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Deep links: ?type=painting (new draft), ?draft=<id>&token=<t> (edit draft)
  const typeParam = searchParams.get("type");
  const draftId = searchParams.get("draft");
  const draftToken = searchParams.get("token");
  const isEditMode = Boolean(draftId && draftToken);

  // Contributor details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [designation, setDesignation] = useState("");

  // Submission details
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState<SubmissionLanguage>("english");
  const [submissionType, setSubmissionType] = useState<SubmissionType>(
    typeParam === "painting" ? "painting" : "writeup"
  );

  // Writeup state
  const [editorHtml, setEditorHtml] = useState("");
  const [editorJson, setEditorJson] = useState<unknown>(null);

  // Painting state
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{
    imageUrl: string;
    imagekitFileId: string;
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Draft loading (edit mode)
  const [loadingDraft, setLoadingDraft] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Workflow state
  const [savingDraft, setSavingDraft] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmedResult | null>(null);

  // Autosave state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  // Holds the latest autosave runner (the timer callback survives re-renders).
  const autosaveRef = useRef<(() => void) | null>(null);

  /** Marks the form dirty and schedules a debounced autosave (edit mode only). */
  const markDirty = () => {
    dirtyRef.current = true;
    setIsDirty(true);
    setSaveStatus("idle");

    if (!isEditMode) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      autosaveRef.current?.();
    }, AUTOSAVE_DELAY_MS);
  };

  /**
   * Debounced autosave (PUT with autosave: true - no audit history entry).
   * Skipped while the title is empty (title is mandatory on the server).
   */
  const runAutosave = async () => {
    if (!dirtyRef.current) return;
    if (!draftId || !draftToken) return;
    if (!title.trim()) return; // cannot save without a title

    dirtyRef.current = false;
    setIsDirty(false);
    setSaveStatus("saving");

    try {
      const payload = buildSavePayload({
        title,
        subtitle,
        category,
        language,
        submissionType,
        editorHtml,
        editorJson,
        uploadedImage,
        caption,
        autosave: true,
      });
      await updateSubmission(draftId, draftToken, payload);
      setSaveStatus("saved");
      setLastSavedAt(new Date());
    } catch {
      // Re-mark dirty so the next change (or manual retry) saves again.
      dirtyRef.current = true;
      setIsDirty(true);
      setSaveStatus("error");
    }
  };

  // Keep the timer's reference to the autosave runner current on every render.
  useEffect(() => {
    autosaveRef.current = () => void runAutosave();
  });

  const retrySave = () => {
    dirtyRef.current = true;
    void runAutosave();
  };

  // Clear any pending autosave timer on unmount.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Warn before leaving the site with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Block in-app navigation with unsaved changes (data router required).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search)
  );

  // Load an existing draft in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    let cancelled = false;
    (async () => {
      try {
        const detail = await getSubmission(draftId!, draftToken!);
        if (cancelled) return;

        if (detail.status !== "draft") {
          setLoadError(
            `This submission has been finalized (status: "${detail.status}") and can no longer be edited. Use your resume link to view it.`
          );
          return;
        }

        setName(detail.contributor.name);
        setPhone(formatIndianMobile(detail.contributor.phone));
        setDesignation(detail.contributor.designation ?? "");
        setTitle(detail.title);
        setSubtitle(detail.subtitle ?? "");
        setCategory(detail.category ?? "");
        setLanguage(detail.language);
        setSubmissionType(detail.submissionType);

        if (detail.writeup) {
          setEditorHtml(detail.writeup.htmlContent);
          setEditorJson(detail.writeup.editorJson);
        }
        if (detail.images?.length) {
          const image = detail.images[0];
          setUploadedImage({
            imageUrl: image.imageUrl,
            imagekitFileId: image.id,
          });
          setCaption(image.caption ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            (err as Error).message ||
              "This private link is invalid or has expired."
          );
        }
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, draftId, draftToken]);

  const handlePhoneBlur = () => {
    const normalized = normalizeIndianMobile(phone);
    if (normalized) {
      setPhone(formatIndianMobile(normalized));
      setPhoneError(null);
    } else if (phone.trim()) {
      setPhoneError("Enter a valid Indian mobile number (10 digits, starting 6-9)");
    } else {
      setPhoneError(null);
    }
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadedImage(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only JPEG, PNG or WebP images are allowed");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image must be 5 MB or smaller");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      setUploadedImage({
        imageUrl: uploaded.imageUrl,
        imagekitFileId: uploaded.imagekitFileId,
      });
      markDirty();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      event.target.value = ""; // allow re-selecting the same file
    }
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    setCaption("");
    setUploadError(null);
    markDirty();
  };

  /** Client-side validation of all mandatory fields. Returns null or the normalized phone. */
  const validateForm = (): string | null => {
    if (!name.trim()) return "Please enter your full name";
    if (name.trim().length > 120) return "Name must be 120 characters or fewer";

    const normalized = normalizeIndianMobile(phone);
    if (!phone.trim()) return "Please enter your mobile number";
    if (!normalized) {
      setPhoneError("Enter a valid Indian mobile number (10 digits, starting 6-9)");
      return "Please correct your mobile number";
    }

    if (!title.trim()) return "Please enter a title for your submission";
    if (title.trim().length > 200) return "Title must be 200 characters or fewer";
    if (subtitle.trim().length > 200) return "Subtitle must be 200 characters or fewer";
    if (category.trim().length > 80) return "Category must be 80 characters or fewer";

    if (submissionType === "writeup" && (!editorHtml || editorHtml === "<p></p>")) {
      return "Please write your content in the editor before submitting";
    }
    if (submissionType === "painting" && !uploadedImage && !isEditMode) {
      return "Please upload a painting image before submitting";
    }

    return normalized;
  };

  /** Validation for Save Draft: only what the server enforces on drafts. */
  const validateDraft = (): string | null => {
    if (!isEditMode) {
      // Creating a draft still needs a contributor identity.
      if (!name.trim()) return "Please enter your full name";
      const normalized = normalizeIndianMobile(phone);
      if (!phone.trim()) return "Please enter your mobile number";
      if (!normalized) {
        setPhoneError("Enter a valid Indian mobile number (10 digits, starting 6-9)");
        return "Please correct your mobile number";
      }
    }
    if (!title.trim()) return "Please enter a title before saving your draft";
    if (title.trim().length > 200) return "Title must be 200 characters or fewer";
    return null;
  };

  const buildContributorDetails = (normalizedPhone: string) => ({
    name: name.trim(),
    phone: normalizedPhone,
    ...(designation.trim() ? { designation: designation.trim() } : {}),
  });

  const baseSavePayload = (autosave: boolean): UpdateSubmissionPayload => ({
    title: title.trim(),
    language,
    autosave,
  });

  /** Manual save of an existing draft (records audit history). */
  const saveExistingDraft = async (normalizedPhone: string | null) => {
    const payload: UpdateSubmissionPayload = {
      ...baseSavePayload(false),
      // Contributor details ride along only when the phone is valid.
      ...(normalizedPhone
        ? { contributor: buildContributorDetails(normalizedPhone) }
        : {}),
    };
    if (submissionType === "writeup") {
      payload.subtitle = subtitle.trim();
      payload.category = category.trim();
      payload.writeup = { htmlContent: editorHtml, editorJson: editorJson ?? {} };
    } else if (uploadedImage) {
      payload.painting = {
        imageUrl: uploadedImage.imageUrl,
        imagekitFileId: uploadedImage.imagekitFileId,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
      };
    }
    return updateSubmission(draftId!, draftToken!, payload);
  };

  /** Creates a brand-new draft (contributor is registered/reused by phone). */
  const createNewDraft = async (normalizedPhone: string) => {
    const contributor = await registerContributor(
      buildContributorDetails(normalizedPhone)
    );
    const payload: CreateSubmissionPayload = {
      contributorId: contributor.id,
      title: title.trim(),
      language,
      submissionType,
    };
    if (submissionType === "writeup") {
      if (subtitle.trim()) payload.subtitle = subtitle.trim();
      if (category.trim()) payload.category = category.trim();
      payload.writeup = { htmlContent: editorHtml, editorJson: editorJson ?? {} };
    } else if (uploadedImage) {
      payload.painting = {
        imageUrl: uploadedImage.imageUrl,
        imagekitFileId: uploadedImage.imagekitFileId,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
      };
    }
    return createSubmission(payload);
  };

  /** Handle "Save Draft": create-then-switch-to-edit, or manual PUT in edit mode. */
  const handleSaveDraft = async () => {
    setError(null);

    const validation = validateDraft();
    if (validation) {
      setError(validation);
      return;
    }

    const normalizedPhone = normalizeIndianMobile(phone);
    if (!isEditMode && (!name.trim() || !normalizedPhone)) return;

    setSavingDraft(true);
    try {
      if (isEditMode) {
        // Flush any pending autosave first (manual save records history).
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        dirtyRef.current = false;
        setIsDirty(false);

        await saveExistingDraft(normalizedPhone);
        setSaveStatus("saved");
        setLastSavedAt(new Date());
        // Stay on the page; the status badge confirms the save.
      } else {
        dirtyRef.current = false;
        setIsDirty(false);
        const created = await createNewDraft(normalizedPhone!);
        persistEditToken(created.id, created.editToken);
        // Switch into edit mode - autosave becomes active from here on.
        navigate(
          `/submit?draft=${created.id}&token=${encodeURIComponent(created.editToken)}`,
          { replace: true }
        );
      }
    } catch (err) {
      setError((err as Error).message);
      dirtyRef.current = true;
      setIsDirty(true);
    } finally {
      setSavingDraft(false);
    }
  };

  /** Handle "Final Submit": save + finalize, then show the confirmation. */
  const handleFinalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runFinalSubmit();
  };

  const runFinalSubmit = async () => {
    setError(null);

    const normalizedPhone = validateForm();
    if (!normalizedPhone) return;

    setFinalizing(true);
    try {
      let submissionId: string;
      let editToken: string | null = null;

      if (isEditMode) {
        submissionId = draftId!;
        editToken = draftToken!;

        // Flush pending autosave, then a full manual save before finalizing.
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        await saveExistingDraft(normalizedPhone);
      } else {
        const created = await createNewDraft(normalizedPhone);
        submissionId = created.id;
        editToken = created.editToken;
        persistEditToken(created.id, created.editToken);
      }

      dirtyRef.current = false;
      setIsDirty(false);
      setSaveStatus("saved");

      const detail = await finalizeSubmission(submissionId, editToken!);
      setResult({
        submissionId: detail.id,
        referenceNumber: detail.referenceNumber,
        title: detail.title,
        submissionType: detail.submissionType,
        editToken: isEditMode ? null : editToken, // existing drafts already have their token
        finalized: true,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFinalizing(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setName("");
    setPhone("");
    setPhoneError(null);
    setDesignation("");
    setTitle("");
    setSubtitle("");
    setCategory("");
    setLanguage("english");
    setSubmissionType("writeup");
    setEditorHtml("");
    setEditorJson(null);
    setUploadedImage(null);
    setCaption("");
    setUploadError(null);
    setSaveStatus("idle");
    setLastSavedAt(null);
  };

  if (result) {
    return (
      <ConfirmationScreen
        result={result}
        onStartAnother={isEditMode ? undefined : resetForm}
      />
    );
  }

  if (loadingDraft) {
    return (
      <div className="py-16">
        <Spinner label="Opening your draft…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <X className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-red-800">
          Unable to open this draft
        </h1>
        <p className="mt-2 text-sm text-red-700">{loadError}</p>
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4">
          Back to the magazine
        </Link>
      </div>
    );
  }

  const busy = savingDraft || finalizing || uploading;

  return (
    <form onSubmit={handleFinalSubmit} className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-maroon-800">
            {isEditMode ? "Continue your draft" : "Submit your contribution"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {isEditMode
              ? "Your saved draft is open — changes save automatically as you write."
              : "Share a writeup or a painting for MADHU SMRUTI."}
          </p>
        </div>
        <AutosaveBadge
          status={saveStatus}
          isEditMode={isEditMode}
          lastSavedAt={lastSavedAt}
          onRetry={retrySave}
        />
      </header>

      {/* Contributor details - no registration or OTP needed */}
      <section className="space-y-4 rounded-xl border border-gold-300 bg-cream-50 p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-maroon-800">Contributor details</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            No account or OTP needed — your mobile number simply identifies your contributions.
          </p>
        </div>
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={markDirty}
          placeholder="Your full name"
          required
          maxLength={120}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              label="Mobile number"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError(null);
              }}
              onBlur={() => {
                handlePhoneBlur();
                markDirty();
              }}
              placeholder="e.g. 98765 43210"
              error={phoneError ?? undefined}
              required
              maxLength={20}
            />
            {!phoneError ? (
              <p className="mt-1 text-xs text-ink-400">Indian mobile numbers only — saved as +91 XXXXX XXXXX</p>
            ) : null}
          </div>
          <Input
            label="Designation (optional)"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            onBlur={markDirty}
            placeholder="e.g. Retired teacher"
            maxLength={120}
          />
        </div>
      </section>

      {/* Submission details */}
      <section className="space-y-4 rounded-xl border border-gold-300 bg-cream-50 p-6">
        <h2 className="font-display text-lg font-bold text-maroon-800">Submission details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Title of your submission"
            required
            maxLength={200}
          />
          <Select
            label="Language"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as SubmissionLanguage);
              markDirty();
            }}
            options={languageOptions}
          />
        </div>
        {submissionType === "writeup" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Subtitle (optional)"
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value);
                markDirty();
              }}
              placeholder="A line under the title"
              maxLength={200}
            />
            <Input
              label="Category (optional)"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                markDirty();
              }}
              placeholder="e.g. Reminiscence, Essay, Poem"
              maxLength={80}
            />
          </div>
        ) : null}
      </section>

      {/* Type menu: Write Up / Painting (locked when editing a draft) */}
      <section className="space-y-4 rounded-xl border border-gold-300 bg-cream-50 p-6">
        <h2 className="font-display text-lg font-bold text-maroon-800">Type of contribution</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isEditMode}
            onClick={() => setSubmissionType("writeup")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              submissionType === "writeup"
                ? "border-maroon-600 bg-maroon-100 text-maroon-700"
                : "border-gold-300 text-ink-500 hover:bg-cream-200"
            } ${isEditMode && submissionType !== "writeup" ? "opacity-50" : ""} disabled:cursor-not-allowed`}
          >
            <PenLine className="h-5 w-5" aria-hidden="true" />
            Write Up
          </button>
          <button
            type="button"
            disabled={isEditMode}
            onClick={() => setSubmissionType("painting")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              submissionType === "painting"
                ? "border-maroon-600 bg-maroon-100 text-maroon-700"
                : "border-gold-300 text-ink-500 hover:bg-cream-200"
            } ${isEditMode && submissionType !== "painting" ? "opacity-50" : ""} disabled:cursor-not-allowed`}
          >
            <Palette className="h-5 w-5" aria-hidden="true" />
            Painting
          </button>
        </div>

        {submissionType === "writeup" ? (
          <div className="space-y-2" onBlur={markDirty}>
            <span className="text-sm font-medium text-ink-700">Your writeup</span>
            <WriteupEditor
              key={isEditMode ? draftId! : "new"}
              initialJson={editorJson ?? undefined}
              initialHtml={editorHtml}
              onChange={({ html, json }) => {
                setEditorHtml(html);
                setEditorJson(json);
                markDirty();
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-sm font-medium text-ink-700">Painting image</span>

            {uploading ? (
              <Spinner label="Uploading image…" />
            ) : uploadedImage ? (
              <div className="flex items-start gap-4 rounded-lg border border-leaf-200 bg-leaf-100 p-3">
                <img
                  src={uploadedImage.imageUrl}
                  alt="Painting preview"
                  className="h-24 w-24 rounded-lg object-cover"
                />
                <div className="flex-1 text-sm text-leaf-700">
                  Image uploaded successfully.
                  <Input
                    label="Caption (optional)"
                    className="mt-2"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onBlur={markDirty}
                    maxLength={300}
                  />
                </div>
                <button
                  type="button"
                  onClick={clearUploadedImage}
                  className="text-ink-400 hover:text-red-600"
                  aria-label="Remove image"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold-400 bg-cream-100 px-6 py-10 text-center transition-colors hover:border-gold-500 hover:bg-gold-100">
                <ImagePlus className="h-8 w-8 text-ink-400" aria-hidden="true" />
                <span className="text-sm font-medium text-ink-700">
                  Click to upload your painting
                </span>
                <span className="text-xs text-ink-400">
                  JPEG, PNG or WebP · max 5 MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleImageSelect}
                />
              </label>
            )}

            {uploadError ? (
              <p className="text-xs text-red-600">{uploadError}</p>
            ) : null}
          </div>
        )}
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Unsaved-changes dialog for in-app navigation */}
      {blocker.state === "blocked" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Unsaved changes"
        >
          <div className="w-full max-w-md rounded-xl border border-gold-300 bg-cream-50 p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-gold-600" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-maroon-800">
                Unsaved changes
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-700">
              You have changes that have not been saved yet. Leave without saving, or
              stay and keep writing?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => blocker.reset()}
              >
                Stay on this page
              </Button>
              <Button
                type="button"
                onClick={() => {
                  dirtyRef.current = false;
                  blocker.proceed();
                }}
              >
                Leave without saving
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void handleSaveDraft()}
        >
          {savingDraft ? <Spinner size="sm" /> : null}
          {savingDraft ? "Saving…" : isEditMode ? "Save Draft" : "Save Draft & continue"}
        </Button>
        <Button type="submit" disabled={busy}>
          {finalizing ? <Spinner size="sm" /> : <CloudUpload className="h-4 w-4" />}
          {finalizing ? "Submitting…" : "Final Submit"}
        </Button>
      </div>
    </form>
  );
}

interface SavePayloadInput {
  title: string;
  subtitle: string;
  category: string;
  language: SubmissionLanguage;
  submissionType: SubmissionType;
  editorHtml: string;
  editorJson: unknown;
  uploadedImage: { imageUrl: string; imagekitFileId: string } | null;
  caption: string;
  autosave: boolean;
}

/** Builds a PUT payload for the debounced autosave (no contributor changes). */
function buildSavePayload(input: SavePayloadInput): UpdateSubmissionPayload {
  const payload: UpdateSubmissionPayload = {
    title: input.title.trim(),
    language: input.language,
    autosave: input.autosave,
  };
  if (input.submissionType === "writeup") {
    payload.subtitle = input.subtitle.trim();
    payload.category = input.category.trim();
    payload.writeup = {
      htmlContent: input.editorHtml,
      editorJson: input.editorJson ?? {},
    };
  } else if (input.uploadedImage) {
    payload.painting = {
      imageUrl: input.uploadedImage.imageUrl,
      imagekitFileId: input.uploadedImage.imagekitFileId,
      ...(input.caption.trim() ? { caption: input.caption.trim() } : {}),
    };
  }
  return payload;
}

/** Live autosave status indicator: saving / saved (with time) / error (retry). */
function AutosaveBadge({
  status,
  isEditMode,
  lastSavedAt,
  onRetry,
}: {
  status: SaveStatus;
  isEditMode: boolean;
  lastSavedAt: Date | null;
  onRetry: () => void;
}) {
  if (!isEditMode) return null;

  if (status === "saving") {
    return (
      <span
        className="flex items-center gap-1.5 text-xs font-medium text-ink-500"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        aria-live="polite"
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Save failed — click to retry
      </button>
    );
  }

  if (status === "saved" && lastSavedAt) {
    return (
      <span
        className="flex items-center gap-1.5 text-xs font-medium text-leaf-600"
        aria-live="polite"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Saved at{" "}
        {lastSavedAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    );
  }

  return (
    <span className="text-xs text-ink-400" aria-live="polite">
      Autosaves as you write
    </span>
  );
}

/**
 * Post-creation confirmation: reference number, one-time edit token and the
 * private resume link. Clear, unmistakable, with copy actions.
 */
function ConfirmationScreen({
  result,
  onStartAnother,
}: {
  result: ConfirmedResult;
  onStartAnother?: () => void;
}) {
  const [copied, setCopied] = useState<"token" | "link" | null>(null);

  const copy = async (kind: "token" | "link", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const link = resumeLink(result.submissionId, result.editToken ?? "");

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-leaf-200 bg-leaf-100 p-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-leaf-600" aria-hidden="true" />
      <h1 className="mt-4 font-display text-2xl font-bold text-leaf-800">
        {result.finalized
          ? "Submitted successfully"
          : result.editToken
            ? "Draft created"
            : "Draft saved"}
      </h1>
      <p className="mt-2 text-sm text-leaf-700">
        {result.finalized
          ? `Your ${result.submissionType === "writeup" ? "write-up" : "painting"} has been submitted to the MADHU SMRUTI editorial team for review. Thank you!`
          : result.editToken
            ? `Thank you! Your ${result.submissionType === "writeup" ? "write-up" : "painting"} draft has been recorded.`
            : "Your changes have been saved and the submission is ready for the editorial team."}
      </p>

      <div className="mt-5 rounded-lg bg-cream-50 p-5 text-left">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-maroon-700" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink-700">Reference number</span>
        </div>
        <p className="mt-1 font-mono text-lg text-maroon-700">{result.referenceNumber}</p>
        <p className="mt-0.5 truncate text-xs text-ink-400">“{result.title}”</p>

        {result.editToken ? (
          <>
            <div className="mt-4 flex items-center gap-2 border-t border-gold-200 pt-3">
              <KeyRound className="h-4 w-4 text-gold-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-ink-700">Your private edit token</span>
              <button
                type="button"
                onClick={() => copy("token", result.editToken!)}
                className="ml-auto text-xs font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-maroon-800"
              >
                {copied === "token" ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-gold-700">
              {result.editToken}
            </p>
          </>
        ) : null}

        {result.editToken ? (
          <>
            <div className="mt-4 flex items-center gap-2 border-t border-gold-200 pt-3">
              <Link2 className="h-4 w-4 text-gold-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-ink-700">Private resume link</span>
              <button
                type="button"
                onClick={() => copy("link", link)}
                className="ml-auto text-xs font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-maroon-800"
              >
                {copied === "link" ? "Copied!" : "Copy link"}
              </button>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-gold-700">{link}</p>
            <a
              href={link}
              className="mt-2 inline-block text-xs font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4"
            >
              Open it now
            </a>

            <p className="mt-3 border-t border-gold-200 pt-3 text-xs leading-relaxed text-ink-500">
              Save this link and token now (they are also stored in this browser). They are
              the <strong className="text-ink-700">only</strong> way to view or edit this draft
              later — the token is stored on our servers as an unreadable hash and cannot be
              recovered.
            </p>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {onStartAnother ? (
          <Button variant="outline" onClick={onStartAnother}>
            Submit another
          </Button>
        ) : null}
        <Link to="/">
          <Button variant="ghost">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
