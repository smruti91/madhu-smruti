import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  FileCheck2,
  ImagePlus,
  KeyRound,
  Palette,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { RichTextEditor } from "../components/editor/RichTextEditor";
import { createSubmission } from "../api/submissions";
import { registerContributor } from "../api/contributors";
import { uploadImage } from "../api/uploads";
import type {
  CreateSubmissionPayload,
  SubmissionCreated,
  SubmissionType,
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

const languageOptions = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "odia", label: "ଓଡ଼ିଆ (Odia)" },
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Submission page: contributor details + Write Up (Tiptap editor) or
 * Painting (ImageKit image upload) depending on the chosen menu.
 */
export function SubmissionPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("english");
  const [submissionType, setSubmissionType] = useState<SubmissionType>("writeup");

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

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionCreated | null>(null);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload: CreateSubmissionPayload = {
      contributorId: "",
      title: title.trim(),
      language: language as CreateSubmissionPayload["language"],
      submissionType,
    };

    if (submissionType === "writeup") {
      if (!editorHtml || editorHtml === "<p></p>") {
        setError("Please write your content in the editor before submitting");
        return;
      }
      payload.writeup = { htmlContent: editorHtml, editorJson: editorJson ?? {} };
    } else {
      if (!uploadedImage) {
        setError("Please upload a painting image before submitting");
        return;
      }
      payload.painting = {
        imageUrl: uploadedImage.imageUrl,
        imagekitFileId: uploadedImage.imagekitFileId,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
      };
    }

    setSubmitting(true);
    try {
      // Step 1: register (or update) the contributor by phone number
      const contributor = await registerContributor({
        name: name.trim(),
        phone: phone.trim(),
        ...(designation.trim() ? { designation: designation.trim() } : {}),
      });

      // Step 2: create the draft submission for that contributor
      payload.contributorId = contributor.id;
      const created = await createSubmission(payload);
      persistEditToken(created.id, created.editToken);
      setResult(created);
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
      <div className="mx-auto max-w-lg rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-green-900">Submission received</h1>
        <p className="mt-2 text-sm text-green-800">
          Thank you, {name.trim()}! Your submission has been recorded.
        </p>
        <div className="mt-4 rounded-lg bg-white p-4 text-left text-sm">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-green-700" aria-hidden="true" />
            <span className="font-semibold text-slate-700">Reference number</span>
          </div>
          <p className="mt-1 font-mono text-lg text-green-700">{result.referenceNumber}</p>
          <div className="mt-3 flex items-center gap-2 border-t border-green-100 pt-3">
            <KeyRound className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span className="font-semibold text-slate-700">Your edit token</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(result.editToken)}
              className="ml-auto text-slate-400 hover:text-sky-600"
              aria-label="Copy edit token"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 break-all font-mono text-xs text-amber-700">
            {result.editToken}
          </p>
          <p className="mt-2 text-xs text-red-600">
            Save this token now (it is also stored in this browser). It is required to
            view or edit your submission later and cannot be recovered.
          </p>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={resetForm}>
            Submit another
          </Button>
          <Link to="/">
            <Button variant="ghost">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Submit your contribution</h1>
        <p className="mt-1 text-sm text-slate-500">
          Share a writeup or a painting for MADHU SMRUTI.
        </p>
      </header>

      {/* Contributor details */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Contributor details</h2>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          required
          maxLength={120}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +91 90000 00000"
            required
            maxLength={20}
          />
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
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Submission details</h2>
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
            onChange={(e) => setLanguage(e.target.value)}
            options={languageOptions}
          />
        </div>
      </section>

      {/* Type menu: Write Up / Painting */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Type of contribution</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSubmissionType("writeup")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              submissionType === "writeup"
                ? "border-sky-600 bg-sky-50 text-sky-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <PenLine className="h-5 w-5" aria-hidden="true" />
            Write Up
          </button>
          <button
            type="button"
            onClick={() => setSubmissionType("painting")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              submissionType === "painting"
                ? "border-sky-600 bg-sky-50 text-sky-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Palette className="h-5 w-5" aria-hidden="true" />
            Painting
          </button>
        </div>

        {submissionType === "writeup" ? (
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Your writeup</span>
            <RichTextEditor
              onChange={({ html, json }) => {
                setEditorHtml(html);
                setEditorJson(json);
              }}
            />
            <p className="text-xs text-slate-400">
              You can format text with headings, bold, italics, lists and more.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-sm font-medium text-slate-700">Painting image</span>

            {uploading ? (
              <Spinner label="Uploading image…" />
            ) : uploadedImage ? (
              <div className="flex items-start gap-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <img
                  src={uploadedImage.imageUrl}
                  alt="Painting preview"
                  className="h-24 w-24 rounded-lg object-cover"
                />
                <div className="flex-1 text-sm text-green-800">
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
                  className="text-slate-400 hover:text-red-600"
                  aria-label="Remove image"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-sky-400 hover:bg-sky-50">
                <ImagePlus className="h-8 w-8 text-slate-400" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-600">
                  Click to upload your painting
                </span>
                <span className="text-xs text-slate-400">
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
          {submitting ? "Submitting…" : "Submit contribution"}
        </Button>
      </div>
    </form>
  );
}
