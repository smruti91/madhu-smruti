import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  FileCheck2,
  ImagePlus,
  KeyRound,
  Link2,
  Palette,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { RichTextEditor } from "../components/editor/RichTextEditor";
import {
  createSubmission,
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

interface ConfirmedResult {
  submissionId: string;
  referenceNumber: string;
  title: string;
  submissionType: SubmissionType;
  /** Only present right after creation - the token is never shown again. */
  editToken: string | null;
  updated: boolean;
}

/**
 * Contributor details + draft submission workflow.
 *
 * Create mode: collects contributor info (name, Indian mobile, optional
 * designation), registers/reuses the contributor, then creates a draft and
 * returns a one-time edit token plus a private resume link.
 *
 * Edit mode (/submit?draft=<id>&token=<token>): loads an existing draft with
 * its private token, prefills everything, and saves changes via PUT.
 */
export function SubmissionPage() {
  const [searchParams] = useSearchParams();

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmedResult | null>(null);

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

    if (submissionType === "writeup" && (!editorHtml || editorHtml === "<p></p>")) {
      return "Please write your content in the editor before submitting";
    }
    if (submissionType === "painting" && !uploadedImage && !isEditMode) {
      return "Please upload a painting image before submitting";
    }

    return normalized;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalizedPhone = validateForm();
    if (!normalizedPhone) return;

    setSubmitting(true);
    try {
      const contributorDetails = {
        name: name.trim(),
        phone: normalizedPhone,
        ...(designation.trim() ? { designation: designation.trim() } : {}),
      };

      if (isEditMode) {
        const payload: UpdateSubmissionPayload = {
          title: title.trim(),
          language,
          contributor: contributorDetails,
        };
        if (submissionType === "writeup") {
          payload.writeup = { htmlContent: editorHtml, editorJson: editorJson ?? {} };
        } else if (uploadedImage) {
          payload.painting = {
            imageUrl: uploadedImage.imageUrl,
            imagekitFileId: uploadedImage.imagekitFileId,
            ...(caption.trim() ? { caption: caption.trim() } : {}),
          };
        }

        const detail = await updateSubmission(draftId!, draftToken!, payload);
        setResult({
          submissionId: detail.id,
          referenceNumber: detail.referenceNumber,
          title: detail.title,
          submissionType: detail.submissionType,
          editToken: null, // the token stays in the URL/localStorage, never re-displayed
          updated: true,
        });
      } else {
        // Step 1: register (or reuse) the contributor by normalized mobile number
        const contributor = await registerContributor(contributorDetails);

        // Step 2: create the draft submission
        const payload: CreateSubmissionPayload = {
          contributorId: contributor.id,
          title: title.trim(),
          language,
          submissionType,
        };
        if (submissionType === "writeup") {
          payload.writeup = { htmlContent: editorHtml, editorJson: editorJson ?? {} };
        } else {
          payload.painting = {
            imageUrl: uploadedImage!.imageUrl,
            imagekitFileId: uploadedImage!.imagekitFileId,
            ...(caption.trim() ? { caption: caption.trim() } : {}),
          };
        }

        const created = await createSubmission(payload);
        persistEditToken(created.id, created.editToken);
        setResult({
          submissionId: created.id,
          referenceNumber: created.referenceNumber,
          title: created.title,
          submissionType: created.submissionType,
          editToken: created.editToken,
          updated: false,
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setName("");
    setPhone("");
    setPhoneError(null);
    setDesignation("");
    setTitle("");
    setLanguage("english");
    setSubmissionType("writeup");
    setEditorHtml("");
    setEditorJson(null);
    setUploadedImage(null);
    setCaption("");
    setUploadError(null);
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

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-maroon-800">
          {isEditMode ? "Continue your draft" : "Submit your contribution"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {isEditMode
            ? "Your saved draft is open — continue where you left off."
            : "Share a writeup or a painting for MADHU SMRUTI."}
        </p>
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
              onBlur={handlePhoneBlur}
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of your submission"
            required
            maxLength={200}
          />
          <Select
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as SubmissionLanguage)}
            options={languageOptions}
          />
        </div>
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
          <div className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Your writeup</span>
            <RichTextEditor
              key={isEditMode ? draftId! : "new"}
              content={editorHtml}
              onChange={({ html, json }) => {
                setEditorHtml(html);
                setEditorJson(json);
              }}
            />
            <p className="text-xs text-ink-400">
              You can format text with headings, bold, italics, lists and more.
            </p>
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

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting || uploading}>
          {submitting ? <Spinner size="sm" /> : null}
          {submitting
            ? isEditMode
              ? "Saving…"
              : "Submitting…"
            : isEditMode
              ? "Save draft"
              : "Create draft"}
        </Button>
      </div>
    </form>
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
        {result.updated ? "Draft saved" : "Draft created"}
      </h1>
      <p className="mt-2 text-sm text-leaf-700">
        {result.updated
          ? "Your changes have been saved to the draft."
          : `Thank you! Your ${result.submissionType === "writeup" ? "write-up" : "painting"} draft has been recorded.`}
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
