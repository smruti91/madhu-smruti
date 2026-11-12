import { Route, Routes } from "react-router-dom";
import { RootLayout } from "../layouts/RootLayout";
import { HomePage } from "../pages/HomePage";
import { SubmissionPage } from "../pages/SubmissionPage";
import { NotFoundPage } from "../pages/NotFoundPage";

/**
 * Application route configuration.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/submit" element={<SubmissionPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
