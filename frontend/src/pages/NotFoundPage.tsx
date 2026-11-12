import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "../components/ui/Button";

/**
 * 404 page.
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <Compass className="h-12 w-12 text-slate-300" aria-hidden="true" />
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-slate-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
