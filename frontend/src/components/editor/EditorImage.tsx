import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Trash2,
} from "lucide-react";

/**
 * Custom "editorImage" block node: a <figure> with an <img> and a caption.
 *
 * Attributes (all persisted in the Tiptap JSON stored in PostgreSQL, so image
 * position, alignment, size and caption survive reopen):
 *  - src / alt: the ImageKit image
 *  - caption:   figcaption text
 *  - width:     percentage width (25-100), rendered as an inline style
 *  - align:     left | center | right, rendered as a CSS class + float style
 */

export type EditorImageAlign = "left" | "center" | "right";

export interface EditorImageAttributes {
  src: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  align: EditorImageAlign;
}

type SetEditorImageOptions = Partial<EditorImageAttributes>;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    editorImage: {
      /** Inserts an image figure at the current cursor position. */
      setEditorImage: (options: SetEditorImageOptions) => ReturnType;
      /** Aligns the selected image figure. */
      setImageAlign: (align: EditorImageAlign) => ReturnType;
      /** Sets the selected image figure width as a percentage. */
      setImageWidth: (width: number | null) => ReturnType;
    };
  }
}

function inlineAlignStyle(align: EditorImageAlign): string {
  switch (align) {
    case "left":
      return "float:left;margin-right:1.25rem;";
    case "right":
      return "float:right;margin-left:1.25rem;";
    default:
      return "margin-left:auto;margin-right:auto;";
  }
}

function parseAlign(className: string): EditorImageAlign {
  if (className.includes("img-align-left")) return "left";
  if (className.includes("img-align-right")) return "right";
  return "center";
}

function parseWidthPercent(style: string): number | null {
  const match = /(?:^|;)\s*width:\s*(\d{1,3})\s*%/.exec(style);
  if (!match) return null;
  const width = Number(match[1]);
  return width >= 10 && width <= 100 ? width : null;
}

export const EditorImage = Node.create({
  name: "editorImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector("img")?.getAttribute("src"),
        renderHTML: (attributes) => ({ src: attributes.src as string }),
      },
      alt: {
        default: null,
        parseHTML: (element) => element.querySelector("img")?.getAttribute("alt"),
        renderHTML: (attributes) =>
          attributes.alt ? { alt: attributes.alt as string } : {},
      },
      caption: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("figcaption")?.textContent ?? null,
        renderHTML: () => ({}),
      },
      width: {
        default: null,
        parseHTML: (element) =>
          parseWidthPercent(element.getAttribute("style") ?? ""),
        renderHTML: () => ({}),
      },
      align: {
        default: "center",
        parseHTML: (element) => parseAlign(element.className),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.editor-image",
        getAttrs: (element) => {
          const figure = element as HTMLElement;
          const style = figure.getAttribute("style") ?? "";
          const hasWidthStyle = /width\s*:/.test(style);
          return {
            caption: figure.querySelector("figcaption")?.textContent ?? null,
            width: hasWidthStyle ? parseWidthPercent(style) : null,
            align: parseAlign(figure.className),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, caption, width, align } =
      node.attrs as EditorImageAttributes;
    const widthStyle = width ? `width:${width}%;` : "";

    return [
      "figure",
      mergeAttributes({
        class: `editor-image img-align-${align}`,
        style: `${inlineAlignStyle(align)}${widthStyle}`,
      }),
      ["img", { src, ...(alt ? { alt } : {}) }],
      ["figcaption", { class: "editor-image-caption" }, caption ?? ""],
    ];
  },

  addCommands() {
    return {
      setEditorImage:
        (options: SetEditorImageOptions) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            type: this.name,
            attrs: { align: "center", ...options },
          }),
      setImageAlign:
        (align: EditorImageAlign) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes(this.name, { align }),
      setImageWidth:
        (width: number | null) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes(this.name, { width }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorImageView);
  },
});

const ALIGN_BUTTONS: Array<{ align: EditorImageAlign; icon: typeof AlignLeft; label: string }> = [
  { align: "left", icon: AlignLeft, label: "Align image left" },
  { align: "center", icon: AlignCenter, label: "Align image center" },
  { align: "right", icon: AlignRight, label: "Align image right" },
];

const WIDTH_OPTIONS = [25, 50, 75, 100];

function EditorImageView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected } = props;
  const { src, alt, caption, width, align } =
    node.attrs as EditorImageAttributes;

  return (
    <NodeViewWrapper
      as="figure"
      className={`editor-image img-align-${align}`}
      style={{ width: width ? `${width}%` : undefined }}
      data-selected={selected ? "true" : undefined}
    >
      <div className="editor-image-frame">
        <img src={src} alt={alt ?? ""} draggable={false} />
        <div className="editor-image-controls" contentEditable={false}>
          {ALIGN_BUTTONS.map(({ align: value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={align === value}
              className={align === value ? "is-active" : undefined}
              onClick={() => updateAttributes({ align: value })}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <select
            title="Image width"
            aria-label="Image width"
            value={width ?? 100}
            onChange={(event) =>
              updateAttributes({ width: Number(event.target.value) })
            }
          >
            {WIDTH_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}%
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Remove image"
            aria-label="Remove image"
            className="text-red-600"
            onClick={deleteNode}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <input
        type="text"
        className="editor-image-caption"
        value={caption ?? ""}
        placeholder="Add a caption (optional)"
        onChange={(event) => updateAttributes({ caption: event.target.value })}
      />
    </NodeViewWrapper>
  );
}
