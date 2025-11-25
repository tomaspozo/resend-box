import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmailsListPage } from "@/pages/EmailsListPage";
import { EmailDetailPage } from "@/pages/EmailDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/emails" replace />} />
          <Route path="emails" element={<EmailsListPage />} />
          <Route path="emails/:id" element={<EmailDetailPage />} />
          <Route
            path="settings"
            element={
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Settings view coming soon
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
