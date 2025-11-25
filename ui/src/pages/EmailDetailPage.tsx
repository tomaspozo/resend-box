import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { EmailDetail } from "@/components/EmailDetail";
import { fetchEmail } from "@/api";
import type { Email } from "@/types";

export const EmailDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/ui/emails");
      return;
    }

    const loadEmail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEmail(id);
        setEmail(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load email";
        setError(message);
        console.error("Failed to load email:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEmail();
  }, [id, navigate]);

  const handleBack = () => {
    navigate("/ui/emails");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error && !email) {
    return (
      <>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          {error}
        </div>
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg max-w-md">
          {error}
        </div>
      </>
    );
  }

  return (
    <>
      <EmailDetail email={email} onBack={handleBack} />
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg max-w-md">
          {error}
        </div>
      )}
    </>
  );
};
