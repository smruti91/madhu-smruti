import { Route, Routes } from "react-router-dom";
import { RootLayout } from "../layouts/RootLayout";
import { HomePage } from "../pages/HomePage";
import { SubmissionPage } from "../pages/SubmissionPage";
import { ResumePage } from "../pages/ResumePage";
import { AdminLoginPage } from "../pages/AdminLoginPage";
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
        <Route path="/resume/:id" element={<ResumePage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
