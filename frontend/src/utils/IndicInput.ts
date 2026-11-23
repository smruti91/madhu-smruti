import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Live phonetic typing for Odia / Hindi (Google Input Tools style).
 *
 * While a script is active, Latin letters typed in the editor are collected
 * into a "word buffer". After every keystroke the whole buffer is
 * re-transliterated and the converted word replaces the previous version in
 * the document, so "n" -> "ନ", "na" -> "ନ", "nam" -> "ନମ" ... and the word
 * is committed when you type space, punctuation, Enter, or move the cursor.
 *
 * Only real Unicode text ends up in the document, which is what the press needs.
 */

export type IndicMode = "english" | "odia" | "hindi";

export interface IndicInputOptions {
  /** Returns the currently selected typing script (read live via a ref). */
  getScript: () => IndicMode;
  /** Whole-word romanized -> native script converter (utils/indic). */
  transliterate: (roman: string, script: "odia" | "hindi") => string;
}

export const IndicInput = Extension.create<IndicInputOptions>({
  name: "indicInput",

  addOptions() {
    return {
      getScript: () => "english",
      transliterate: (roman: string) => roman,
    };
  },

  addProseMirrorPlugins() {
    const { getScript, transliterate } = this.options;

    let buffer = ""; // romanized letters of the word being typed
    let start = 0; // doc position where the converted word begins
    let outLen = 0; // length of the converted word currently in the doc

    const reset = () => {
      buffer = "";
      outLen = 0;
    };

    const render = (view: EditorView, from: number, to: number, out: string) => {
      const tr = view.state.tr.insertText(out, from, to);
      tr.setSelection(TextSelection.create(tr.doc, from + out.length));
      view.dispatch(tr);
      start = from;
      outLen = out.length;
    };

    return [
      new Plugin({
        key: new PluginKey("indicInput"),
        props: {
          handleTextInput(view, from, to, text) {
            const script = getScript();
            if (script === "english") return false;

            // Anything that isn't a single Latin letter ends the current word
            // and is inserted normally (space, punctuation, digits, ...).
            if (!/^[A-Za-z]$/.test(text)) {
              reset();
              return false;
            }

            const continuing =
              buffer !== "" && from === to && from === start + outLen;

            let replaceFrom: number;
            let replaceTo: number;
            if (continuing) {
              replaceFrom = start;
              replaceTo = start + outLen;
            } else {
              buffer = "";
              replaceFrom = from;
              replaceTo = to;
            }

            buffer += text;
            render(view, replaceFrom, replaceTo, transliterate(buffer, script));
            return true;
          },

          handleKeyDown(view, event) {
            const script = getScript();
            if (script === "english") return false;

            const { selection } = view.state;

            // Backspace removes the last ROMAN letter and re-converts the word,
            // so "namaste" -> backspace -> "namast" behaves as users expect.
            if (
              event.key === "Backspace" &&
              buffer !== "" &&
              selection.empty &&
              selection.from === start + outLen
            ) {
              buffer = buffer.slice(0, -1);
              const out = buffer ? transliterate(buffer, script) : "";
              render(view, start, start + outLen, out);
              if (!buffer) reset();
              event.preventDefault();
              return true;
            }

            // Any navigation / shortcut / Enter / Tab ends the current word.
            if (
              event.ctrlKey ||
              event.metaKey ||
              (event.key.length > 1 &&
                !["Shift", "CapsLock", "Backspace"].includes(event.key))
            ) {
              reset();
            }
            return false;
          },

          handleDOMEvents: {
            mousedown: () => {
              reset();
              return false;
            },
            blur: () => {
              reset();
              return false;
            },
          },
        },
      }),
    ];
  },
});
