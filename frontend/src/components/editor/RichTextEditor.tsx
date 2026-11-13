import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface RichTextEditorProps {
  /** Initial HTML content. */
  content?: string;
  /** Called with the updated HTML and Tiptap JSON whenever the document changes. */
  onChange?: (payload: { html: string; json: unknown }) => void;
  editable?: boolean;
}

/**
 * Reusable Tiptap rich text editor wrapper.
 * Extensions can be extended per feature (e.g. images via ImageKit URLs).
 */
export function RichTextEditor({
  content = "",
  onChange,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange?.({ html: current.getHTML(), json: current.getJSON() });
    },
  });

  return (
    <div className="rounded-lg border border-slate-300 bg-white">
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-40 px-4 py-3 focus:outline-none [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
