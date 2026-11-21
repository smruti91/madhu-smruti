import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Camera,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  deleteImage,
  uploadContributorPhoto,
} from "../../api/uploads";
import type { ContributorPhoto } from "../../types/submission";

/**
 * Optional contributor photograph field.
 *
 * A local preview appears immediately, then the file is uploaded to ImageKit
 * through the authenticated backend. The resulting URL + fileId are reported
 * to the parent so they travel with the draft / final submission.
 */
export interface ContributorPhotoUploadProps {
  value: ContributorPhoto | null;
  onChange: (photo: ContributorPhoto | null) => void;
  maxFileSizeBytes: number;
  /** Needed so a saved photo can be removed/replaced by its owner. */
  contributorId?: string | null;
  disabled?: boolean;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function ContributorPhotoUpload({
  value,
  onChange,
  maxFileSizeBytes,
  contributorId,
  disabled = false,
}: ContributorPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Clean up object URLs on unmount / preview change.
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  const setPreviewUrl = (url: string | null) => {
    if (localPreviewRef.current && localPreviewRef.current !== url) {
      URL.revokeObjectURL(localPreviewRef.current);
    }
    localPreviewRef.current = url;
    setLocalPreview(url);
  };

  /** Removes a photo from ImageKit when replacing/removing it. */
  const cleanupFile = async (fileId: string) => {
    try {
      await deleteImage(fileId, contributorId);
    } catch {
      // The field is cleared on save; any leftover file is harmless and can be
      // cleaned up later by an admin.
    }
  };

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file || disabled || uploading) return;

    setError(null);
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Only JPEG, JPG, PNG or WebP photos are allowed.");
      return;
    }
    if (file.size > maxFileSizeBytes) {
      setError(
        `Photo must be ${formatBytes(maxFileSizeBytes)} or smaller (selected: ${formatBytes(file.size)}).`
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);
    setUploading(true);
    setProgress(0);

    const previous = value;
    try {
      const uploaded = await uploadContributorPhoto(file, setProgress);
      setPreviewUrl(null);
      onChange({
        imageUrl: uploaded.imageUrl,
        imagekitFileId: uploaded.imagekitFileId,
      });
      // Replace: clean up the file that was shown before this one.
      if (previous && previous.imagekitFileId !== uploaded.imagekitFileId) {
        void cleanupFile(previous.imagekitFileId);
      }
    } catch (err) {
      setPreviewUrl(null);
      setError(
        (err as Error).message ||
          "Upload failed. Check your connection and try again."
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = () => {
    if (!value || disabled || uploading) return;
    void cleanupFile(value.imagekitFileId);
    setPreviewUrl(null);
    onChange(null);
    setError(null);
  };

  const preview = localPreview ?? value?.imageUrl ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* Profile preview */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold-300 bg-cream-200">
          {preview ? (
            <img
              src={preview}
              alt="Contributor photo preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera className="h-8 w-8 text-ink-400" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {uploading ? (
            <div className="space-y-1" aria-live="polite">
              <p className="flex items-center gap-2 text-sm text-maroon-700">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading photo… {progress}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-300">
                <div
                  className="h-full rounded-full bg-gold-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-ink-700">
                {value ? "Photo ready to save" : "A photo helps readers connect with you."}
              </p>
              <p className="text-xs text-ink-400">
                JPEG, JPG, PNG or WebP · max {formatBytes(maxFileSizeBytes)}
              </p>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-maroon-300 bg-white px-3 py-1.5 text-sm font-medium text-maroon-700 transition-colors hover:bg-maroon-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {value ? (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
              )}
              {value ? "Replace Photo" : "Upload Photo"}
            </button>
            {value ? (
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        onChange={handleSelect}
        aria-label="Contributor photo"
      />

      {error ? (
        <p
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
