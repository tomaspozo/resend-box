import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmailsListPage } from "@/pages/EmailsListPage";
import { EmailDetailPage } from "@/pages/EmailDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/emails" replace />} />
          <Route path="emails" element={<EmailsListPage />} />
          <Route path="emails/:id" element={<EmailDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
