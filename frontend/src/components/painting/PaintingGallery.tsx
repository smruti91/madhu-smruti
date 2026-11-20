import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { uploadImage } from "../../api/uploads";
import type { PaintingImageInput } from "../../types/submission";

/**
 * Gallery-style painting uploader.
 *
 * - multi-file upload (JPEG / PNG / WebP) with per-file progress
 * - live previews, per-image captions
 * - reorder by drag-and-drop or the accessible up/down buttons
 * - delete before submission
 * - enforces the server's max size / max count, blocks duplicate files
 *
 * Everything is controlled by the parent through `images`; uploads happen
 * immediately and only successfully uploaded files enter the list.
 */

export interface PaintingGalleryProps {
  images: PaintingImageInput[];
  onChange: (images: PaintingImageInput[]) => void;
  maxImages: number;
  maxFileSizeBytes: number;
  disabled?: boolean;
}

interface PendingUpload {
  id: string;
  name: string;
  progress: number;
  error: string | null;
}

let uploadCounter = 0;

export function PaintingGallery({
  images,
  onChange,
  maxImages,
  maxFileSizeBytes,
  disabled = false,
}: PaintingGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const atCapacity = images.length >= maxImages;
  const remaining = Math.max(0, maxImages - images.length);
  const busy = pending.length > 0;

  const addFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    const list = Array.from(files);
    if (list.length === 0) return;

    const capacity = maxImages - images.length;
    if (capacity <= 0) {
      setUploadError(
        `You can add up to ${maxImages} image${maxImages === 1 ? "" : "s"} per painting. Remove one to add another.`
      );
      return;
    }

    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of list) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        rejected.push(`${file.name}: only JPEG, PNG or WebP`);
        continue;
      }
      if (file.size > maxFileSizeBytes) {
        rejected.push(
          `${file.name}: larger than ${formatBytes(maxFileSizeBytes)}`
        );
        continue;
      }
      accepted.push(file);
    }
    if (rejected.length > 0) {
      setUploadError(rejected.join(" · "));
    }

    const toUpload = accepted.slice(0, capacity);
    if (accepted.length > capacity) {
      setUploadError(
        (previous) =>
          [previous, `Only ${capacity} more image${capacity === 1 ? "" : "s"} can be added.`]
            .filter(Boolean)
            .join(" · ")
      );
    }

    // Upload sequentially so progress stays readable and the server is not
    // hit with a burst of parallel multipart requests.
    const uploaded: PaintingImageInput[] = [];
    for (const file of toUpload) {
      const uploadId = `upload-${(uploadCounter += 1)}`;
      setPending((current) => [
        ...current,
        { id: uploadId, name: file.name, progress: 0, error: null },
      ]);

      try {
        const result = await uploadImage(file, (progress) => {
          setPending((current) =>
            current.map((item) =>
              item.id === uploadId ? { ...item, progress } : item
            )
          );
        });
        uploaded.push({
          imageUrl: result.imageUrl,
          imagekitFileId: result.imagekitFileId,
        });
        setPending((current) => current.filter((item) => item.id !== uploadId));
      } catch (error) {
        const message =
          (error as Error).message || `Could not upload ${file.name}`;
        setPending((current) =>
          current.map((item) =>
            item.id === uploadId ? { ...item, error: message } : item
          )
        );
      }
    }

    if (uploaded.length > 0) {
      onChange([...images, ...uploaded]);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void addFiles(event.target.files);
    event.target.value = ""; // allow re-selecting the same file
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (disabled || busy) return;
    if (event.dataTransfer.files.length > 0) {
      void addFiles(event.dataTransfer.files);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, caption: string) => {
    onChange(
      images.map((image, i) =>
        i === index ? { ...image, caption: caption || undefined } : image
      )
    );
  };

  const makePrimary = (index: number) => {
    move(index, 0);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !atCapacity) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-gold-500 bg-gold-100"
            : "border-gold-300 bg-cream-100 hover:border-gold-400"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <UploadCloud
          className={`mx-auto h-9 w-9 ${dragOver ? "text-gold-600" : "text-ink-400"}`}
          aria-hidden="true"
        />
        <p className="mt-2 text-sm font-medium text-ink-700">
          {atCapacity
            ? `All ${maxImages} image slots are filled`
            : "Drop paintings here, or browse"}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          JPEG, PNG or WebP · max {formatBytes(maxFileSizeBytes)} each ·{" "}
          {remaining} of {maxImages} slots left
        </p>
        <button
          type="button"
          disabled={disabled || atCapacity}
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Add images
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || atCapacity}
          className="sr-only"
          onChange={handleInputChange}
        />
      </div>

      {/* Upload progress */}
      {pending.length > 0 ? (
        <ul className="space-y-2" aria-live="polite">
          {pending.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                item.error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gold-200 bg-gold-100 text-ink-700"
              }`}
            >
              {item.error ? (
                <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.name}</span>
                {item.error ? (
                  <span className="block text-xs">{item.error}</span>
                ) : (
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-300">
                      <span
                        className="block h-full rounded-full bg-gold-500 transition-[width]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </span>
                    <span className="w-9 text-right text-xs tabular-nums">
                      {item.progress}%
                    </span>
                  </span>
                )}
              </span>
              {item.error ? (
                <button
                  type="button"
                  onClick={() =>
                    setPending((current) =>
                      current.filter((entry) => entry.id !== item.id)
                    )
                  }
                  className="text-xs font-medium underline underline-offset-2"
                >
                  Dismiss
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {uploadError ? (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {uploadError}
        </p>
      ) : null}

      {/* Gallery grid */}
      {images.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <GalleryCard
              key={`${image.imageUrl}-${index}`}
              image={image}
              index={index}
              total={images.length}
              isPrimary={index === 0}
              dragging={dragIndex === index}
              disabled={disabled || busy}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
              }}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onMakePrimary={() => makePrimary(index)}
              onRemove={() => removeAt(index)}
              onCaptionChange={(value) => updateCaption(index, value)}
            />
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-ink-400">
        Drag cards to reorder, or use the arrow buttons. The first image is used
        as the cover.
      </p>
    </div>
  );
}

function GalleryCard({
  image,
  index,
  total,
  isPrimary,
  dragging,
  disabled,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  onMakePrimary,
  onRemove,
  onCaptionChange,
}: {
  image: PaintingImageInput;
  index: number;
  total: number;
  isPrimary: boolean;
  dragging: boolean;
  disabled: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDrop: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMakePrimary: () => void;
  onRemove: () => void;
  onCaptionChange: (value: string) => void;
}) {
  return (
    <li
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        dragging ? "opacity-50" : ""
      } ${isPrimary ? "border-gold-400 ring-1 ring-gold-300" : "border-cream-300"}`}
    >
      <div className="relative aspect-[4/3] bg-cream-200">
        <img
          src={image.imageUrl}
          alt={image.caption || `Painting image ${index + 1}`}
          loading="lazy"
          className="h-full w-full object-contain"
        />

        {isPrimary ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-semibold text-maroon-900 shadow">
            <Star className="h-3 w-3" aria-hidden="true" />
            Cover
          </span>
        ) : (
          <span className="absolute left-2 top-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-[11px] font-medium text-white">
            {index + 1}
          </span>
        )}

        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {!isPrimary ? (
            <IconButton label="Make cover image" onClick={onMakePrimary} disabled={disabled}>
              <Star className="h-4 w-4" />
            </IconButton>
          ) : null}
          <IconButton label="Remove image" onClick={onRemove} disabled={disabled} danger>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconButton
            label="Move image earlier"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
          >
            <ArrowUp className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Move image later"
            onClick={onMoveDown}
            disabled={disabled || index === total - 1}
          >
            <ArrowDown className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="p-3">
        <label
          className="text-xs font-medium text-ink-500"
          htmlFor={`caption-${index}-${image.imageUrl.slice(-12)}`}
        >
          Caption {isPrimary ? "(cover)" : ""}
        </label>
        <input
          id={`caption-${index}-${image.imageUrl.slice(-12)}`}
          type="text"
          value={image.caption ?? ""}
          onChange={(event) => onCaptionChange(event.target.value)}
          disabled={disabled}
          maxLength={300}
          placeholder="e.g. Village at dusk, oil on canvas"
          className="mt-1 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-1.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-400 focus:outline-none disabled:opacity-60"
        />
      </div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg bg-cream-50/95 text-ink-700 shadow transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "hover:text-red-600" : "hover:text-maroon-700"
      }`}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}