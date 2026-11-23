import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Italic,
  Link2,
  Languages,
  Link2Off,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";
import { EditorImage } from "./EditorImage";
import { uploadImage } from "../../api/uploads";
import {
  SCRIPT_LABELS,
  transliterate,
  type IndicScript,
} from "../../utils/indic";
import { IndicInput } from "../../utils/IndicInput";

/**
 * Full writeup editor for MADHU SMRUTI.
 *
 * - Unicode input is passthrough: users type with their own device keyboard or
 *   input method (Odia / Hindi / English); no transformation is applied.
 * - The toolbar wraps on small screens instead of scrolling away.
 * - "Focus mode" turns the editor into a full-page writing surface.
 * - Images upload to ImageKit and are inserted at the cursor as figure nodes.
 * - onChange reports { html, json } so the page can autosave Tiptap JSON.
 */

export interface WriteupEditorProps {
  /** Initial Tiptap JSON - used to reconstruct a saved draft exactly. */
  initialJson?: unknown;
  /** Initial HTML fallback when no JSON snapshot exists yet. */
  initialHtml?: string;
  /** Called with the rendered HTML and the Tiptap JSON on every change. */
  onChange?: (payload: { html: string; json: unknown }) => void;
  /** Compact height for narrow forms (e.g. painting page not needed). */
  minHeight?: string;
}

interface ToolbarState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isH2: boolean;
  isH3: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isBlockquote: boolean;
  isLink: boolean;
  align: "left" | "center" | "right" | "justify";
  fontSize: string;
  color: string;
  canUndo: boolean;
  canRedo: boolean;
}

function computeToolbarState(editor: Editor): ToolbarState {
  return {
    isBold: editor.isActive("bold"),
    isItalic: editor.isActive("italic"),
    isUnderline: editor.isActive("underline"),
    isStrike: editor.isActive("strike"),
    isH2: editor.isActive("heading", { level: 2 }),
    isH3: editor.isActive("heading", { level: 3 }),
    isBulletList: editor.isActive("bulletList"),
    isOrderedList: editor.isActive("orderedList"),
    isBlockquote: editor.isActive("blockquote"),
    isLink: editor.isActive("link"),
    align:
      (editor.getAttributes("paragraph").textAlign as ToolbarState["align"]) ||
      "left",
    fontSize:
      (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "",
    color:
      (editor.getAttributes("textStyle").color as string | undefined) ?? "",
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };
}

const FONT_SIZES: Array<{ value: string; label: string }> = [
  { value: "", label: "Size" },
  { value: "0.875rem", label: "Small" },
  { value: "1rem", label: "Normal" },
  { value: "1.25rem", label: "Large" },
  { value: "1.5rem", label: "X-Large" },
  { value: "2rem", label: "Huge" },
];

const COLOR_PRESETS: Array<{ value: string; label: string }> = [
  { value: "", label: "Ink (default)" },
  { value: "#4a121b", label: "Maroon" },
  { value: "#a37c2a", label: "Gold" },
  { value: "#2f5340", label: "Leaf green" },
  { value: "#2a2018", label: "Dark ink" },
];

export function WriteupEditor({
  initialJson,
  initialHtml = "",
  onChange,
}: WriteupEditorProps) {
  const [focusMode, setFocusMode] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  // Indic typing support: script mode + optional romanized input helper.
  const [script, setScript] = useState<IndicScript | "english">("english");
  const [indicHelperOpen, setIndicHelperOpen] = useState(false);
  const [romanInput, setRomanInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestHtmlRef = useRef("");

  // after the `script` useState line:
const scriptRef = useRef(script);
scriptRef.current = script;

  // Live transliteration preview (Google Translate style): shows the native
  // script output as the user types romanized text, before they insert it.
  const transliteratedPreview =
    script !== "english" && romanInput.trim()
      ? transliterate(romanInput, script)
      : "";

  const editor = useEditor({
    // JSON snapshot is authoritative for saved drafts; HTML is the fallback.
    content: initialJson ?? initialHtml,
    extensions: [
      StarterKit,
      TextStyleKit,
      TextAlign.configure({
        types: ["heading", "paragraph", "blockquote"],
      }),
      EditorImage,
          IndicInput.configure({
        getScript: () => scriptRef.current,
        transliterate,
      }),
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      latestHtmlRef.current = html;
      onChange?.({ html, json: current.getJSON() });
    },
  });

  const state = useEditorState<ToolbarState | null>({
    editor,
    selector: (ctx) => (ctx.editor ? computeToolbarState(ctx.editor) : null),
  });

  // Mark the editable area with the active language so device keyboards and
  // screen readers treat the input correctly.
  const LANG_CODES = { english: "en", odia: "or", hindi: "hi" } as const;

useEffect(() => {
  if (!editor) return;
  editor.view.dom.setAttribute("lang", LANG_CODES[script]);
}, [editor, script]);

  const insertTransliterated = () => {
    if (!editor || script === "english" || !romanInput.trim()) return;
    const text = transliterate(romanInput, script);
    editor.chain().focus().insertContent(text).run();
    setRomanInput("");
  };

  const scriptClass =
    script === "odia" ? "script-odia" : script === "hindi" ? "script-hindi" : "";

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ""; // allow re-selecting the same file

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Only JPEG, PNG or WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be 5 MB or smaller");
      return;
    }

    setImageError(null);
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage(file);
      editor
        ?.chain()
        .focus()
        .setEditorImage({ src: uploaded.imageUrl })
        .run();
    } catch (err) {
      setImageError((err as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  const applyLink = () => {
    if (!editor) return;
    if (!linkValue.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = /^https?:\/\//i.test(linkValue.trim())
      ? linkValue.trim()
      : `https://${linkValue.trim()}`;
    editor.chain().focus().setLink({ href }).run();
    setLinkValue("");
  };

  const openPreview = () => {
    if (!editor) return;
    setPreviewHtml(editor.getHTML());
    setPreviewOpen(true);
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gold-300 bg-cream-100 p-1.5">
      {/* Undo / redo */}
      <ToolbarButton
        label="Undo"
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!state?.canUndo}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!state?.canRedo}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Odia / Hindi typing support */}
      <div
        className="flex items-center gap-1 rounded-md border border-gold-300 bg-white px-1.5"
        title="Typing script"
      >
        <Languages className="h-4 w-4 text-gold-600" aria-hidden="true" />
        {(["english", "odia", "hindi"] as const).map((option) => (
          <button
            key={option}
            type="button"
            title={`Type in ${SCRIPT_LABELS[option]}`}
            aria-pressed={script === option}
            onClick={() => {
              setScript(option);
              if (option !== "english") setIndicHelperOpen(true);
            }}
            className={`rounded px-1.5 py-1 text-xs font-medium transition-colors ${
              script === option
                ? "bg-maroon-600 text-white"
                : "text-ink-700 hover:bg-gold-200"
            }`}
          >
            {SCRIPT_LABELS[option]}
          </button>
        ))}
      </div>

      <Divider />

      {/* Inline styles */}
      <ToolbarButton
        label="Bold"
        active={state?.isBold}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state?.isItalic}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state?.isUnderline}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state?.isStrike}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        label="Heading 2"
        active={state?.isH2}
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <span className="px-0.5 text-xs font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={state?.isH3}
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        <span className="px-0.5 text-xs font-bold">H3</span>
      </ToolbarButton>

      <Divider />

      {/* Font size */}
      <select
        aria-label="Font size"
        title="Font size"
        value={state?.fontSize ?? ""}
        onChange={(event) => {
          if (!editor) return;
          const value = event.target.value;
          if (!value) {
            editor.chain().focus().unsetFontSize().run();
          } else {
            editor.chain().focus().setFontSize(value).run();
          }
        }}
        className="h-8 rounded-md border border-gold-300 bg-white px-1.5 text-xs text-ink-700"
      >
        {FONT_SIZES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Text color */}
      <select
        aria-label="Text color"
        title="Text color"
        value={state?.color ?? ""}
        onChange={(event) => {
          if (!editor) return;
          const value = event.target.value;
          if (!value) {
            editor.chain().focus().unsetColor().run();
          } else {
            editor.chain().focus().setColor(value).run();
          }
        }}
        className="h-8 rounded-md border border-gold-300 bg-white px-1.5 text-xs text-ink-700"
      >
        {COLOR_PRESETS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        label="Align left"
        active={state?.align === "left"}
        onClick={() => editor?.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align center"
        active={state?.align === "center"}
        onClick={() => editor?.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        active={state?.align === "right"}
        onClick={() => editor?.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Justify"
        active={state?.align === "justify"}
        onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        label="Bulleted list"
        active={state?.isBulletList}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state?.isOrderedList}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      {/* Blockquote */}
      <ToolbarButton
        label="Blockquote"
        active={state?.isBlockquote}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Hyperlink */}
      <div className="flex items-center gap-1 rounded-md border border-gold-300 bg-white px-1">
        <ToolbarButton label={state?.isLink ? "Edit link" : "Add link"} active={state?.isLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <input
          type="url"
          placeholder="example.com"
          aria-label="Link URL"
          value={linkValue}
          onChange={(event) => setLinkValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyLink();
            }
          }}
          className="w-36 bg-transparent text-xs text-ink-700 placeholder:text-ink-400 focus:outline-none sm:w-44"
        />
        <ToolbarButton label="Apply link" onClick={applyLink}>
          <span className="px-0.5 text-xs font-semibold text-maroon-700">Go</span>
        </ToolbarButton>
        {state?.isLink ? (
          <ToolbarButton
            label="Remove link"
            onClick={() => {
              editor?.chain().focus().unsetLink().run();
              setLinkValue("");
            }}
          >
            <Link2Off className="h-4 w-4" />
          </ToolbarButton>
        ) : null}
      </div>

      <Divider />

      {/* Insert image (ImageKit) */}
      <ToolbarButton
        label={uploadingImage ? "Uploading image…" : "Insert image"}
        disabled={uploadingImage}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploadingImage ? (
          <span className="px-0.5 text-xs font-medium">…</span>
        ) : (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        )}
      </ToolbarButton>

      <Divider />

      {/* Focus mode + preview */}
      <ToolbarButton
        label="Full-page writing mode"
        onClick={() => setFocusMode(true)}
      >
        <Maximize2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Preview article" onClick={openPreview}>
        <Eye className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );

  return (
    <div className="space-y-2">
      {toolbar}

      {/* Roman → Odia / Hindi typing helper */}
      {script !== "english" ? (
        <div className="rounded-lg border border-gold-300 bg-cream-100 p-3">
          <button
            type="button"
            onClick={() => setIndicHelperOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left text-sm font-medium text-maroon-700"
            aria-expanded={indicHelperOpen}
          >
            <span className="flex items-center gap-2">
              <Languages className="h-4 w-4" aria-hidden="true" />
              Type {SCRIPT_LABELS[script]} without an Indic keyboard
            </span>
            <span className="text-xs text-ink-500">
              {indicHelperOpen ? "Hide" : "Show"}
            </span>
          </button>
          {indicHelperOpen ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={romanInput}
                  onChange={(event) => setRomanInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      insertTransliterated();
                    }
                  }}
                  placeholder="Type romanized text, e.g. namaste"
                  aria-label={`Romanized ${SCRIPT_LABELS[script]} text`}
                  className="min-w-0 flex-1 rounded-md border border-gold-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={insertTransliterated}
                  disabled={!romanInput.trim()}
                  className="rounded-md bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Insert in {SCRIPT_LABELS[script]}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-700">
                  Preview:
                </span>
                <span
                  className={`rounded-md border px-3 py-2 text-sm ${
                    transliteratedPreview
                      ? "border-gold-300 bg-white text-ink-900"
                      : "border-dashed border-gold-200 bg-white/60 text-ink-400"
                  } ${scriptClass}`}
                >
                  {transliteratedPreview || "Type romanized text to preview…"}
                </span>
              </div>
              <p className="text-xs text-ink-500">
                This helper converts common sounds as a rough guide. If you
                already have an Odia/Hindi keyboard, you can type directly in
                the editor — nothing is changed or transformed.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {imageError ? (
        <p className="text-xs text-red-600">{imageError}</p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleImageSelect}
      />

      {!focusMode ? (
        <div className="rounded-lg border border-gold-300 bg-white">
          <EditorContent
            editor={editor}
            className={`writeup-prose min-h-64 px-5 py-4 sm:min-h-80 ${scriptClass}`}
          />
        </div>
      ) : null}
      <p className="text-xs text-ink-400">
        Choose a script above, then type with your device keyboard or use the
        romanized helper. Text is saved exactly as written.
      </p>

      {/* Full-page (focus) writing mode */}
      {focusMode && editor ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-cream-50">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-maroon-800">
                Writing mode
              </p>
              <div className="flex items-center gap-2">
                <ButtonLike onClick={() => setFocusMode(false)}>
                  <Minimize2 className="h-4 w-4" />
                  Exit writing mode
                </ButtonLike>
              </div>
            </div>
            {toolbar}
            <div className="flex-1 rounded-lg border border-gold-300 bg-white">
              <EditorContent
                editor={editor}
                className={`writeup-prose min-h-[60vh] px-6 py-5 ${scriptClass}`}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Article preview */}
      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Article preview"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="my-8 w-full max-w-2xl rounded-xl border border-gold-300 bg-cream-50 p-6 shadow-xl sm:p-10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-maroon-800">
                Preview
              </h2>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setPreviewOpen(false)}
                className="rounded-full p-1 text-ink-500 hover:bg-cream-200 hover:text-ink-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              className="writeup-prose mt-4"
              // This preview renders the contributor's own live editor output;
              // the server separately sanitizes HTML before storage & admin review.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 transition-colors ${
        active
          ? "bg-maroon-600 text-white"
          : "text-ink-700 hover:bg-gold-200 hover:text-maroon-800"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-gold-200" aria-hidden="true" />;
}

function ButtonLike({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-maroon-600 px-3 py-1.5 text-sm font-medium text-maroon-700 transition-colors hover:bg-maroon-600 hover:text-white"
    >
      {children}
    </button>
  );
}
