import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, PenLine, Server } from "lucide-react";
import { useHealth } from "../hooks/useHealth";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { RichTextEditor } from "../components/editor/RichTextEditor";
import { APP_NAME, APP_NAME_ODIA, ORGANIZATION } from "../config/constants";

const SAMPLE_HTML = "<p>Welcome to <strong>MADHU SMRUTI</strong> — start typing…</p>";

/**
 * Landing page. Shows app intro, live backend health status,
 * and a preview of the reusable rich text editor.
 */
export function HomePage() {
  const { data, loading, error } = useHealth();
  const [html, setHtml] = useState(SAMPLE_HTML);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 px-8 py-12 text-center text-white">
        <Heart className="mx-auto mb-4 h-10 w-10 opacity-80" aria-hidden="true" />
        <h1 className="text-4xl font-bold">{APP_NAME}</h1>
        <p className="mt-1 text-lg text-sky-100">{APP_NAME_ODIA}</p>
        <p className="mt-4 text-sm text-sky-100">
          A memorial web application by {ORGANIZATION}.
        </p>
        <Link to="/submit">
          <Button variant="secondary" className="mt-6 bg-white text-sky-700 hover:bg-sky-50">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Submit a writeup or painting
          </Button>
        </Link>
      </section>

      {/* Backend status */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Server className="h-5 w-5 text-sky-600" aria-hidden="true" />
          Backend status
        </h2>

        {loading ? (
          <div className="mt-4">
            <Spinner label="Checking API health…" />
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">
            API unreachable: {error}
          </p>
        ) : data ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Service</dt>
              <dd className="font-medium">{data.service}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Version</dt>
              <dd className="font-medium">{data.version}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Environment</dt>
              <dd className="font-medium">{data.environment}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Database</dt>
              <dd>
                <Badge tone={data.database === "connected" ? "green" : "amber"}>
                  {data.database}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">ImageKit</dt>
              <dd>
                <Badge tone={data.imagekit === "configured" ? "green" : "amber"}>
                  {data.imagekit}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Uptime</dt>
              <dd className="font-medium">{data.uptimeSeconds}s</dd>
            </div>
          </dl>
        ) : null}
      </section>

      {/* Rich text editor preview */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Rich text editor preview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Reusable Tiptap wrapper wired for future memory/story features.
        </p>
        <div className="mt-4">
          <RichTextEditor
            content={SAMPLE_HTML}
            onChange={({ html: value }) => setHtml(value)}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(html)}>
            Copy HTML
          </Button>
          <span className="truncate text-xs text-slate-400">{html.slice(0, 60)}…</span>
        </div>
      </section>
    </div>
  );
}
