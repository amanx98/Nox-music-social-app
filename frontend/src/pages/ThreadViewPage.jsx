import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { getThread } from "../api/client";
import ThreadView from "../ThreadView";
import EditPostModal from "../components/composer/EditPostModal";
import { Button } from "../components/ui/Button";

export default function ThreadViewPage({ user: propUser }) {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext?.() || {};
  const user = propUser || context?.user;

  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingThread, setEditingThread] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchThread() {
      if (!threadId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getThread(threadId);
        if (mounted) setThread(data);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load thread.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchThread();
    return () => {
      mounted = false;
    };
  }, [threadId]);

  function handleThreadUpdated(updated) {
    if (!updated) return;
    setThread(updated);
  }

  function handleBack() {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-[960px] mx-auto py-16 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
        <span className="font-mono text-xs text-text-dim uppercase tracking-widest">
          TUNING TRANSMISSION FREQUENCY...
        </span>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="w-full max-w-[640px] mx-auto py-16 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-heading text-xl font-bold text-text">Transmission Not Found</h2>
        <p className="text-sm text-text-muted">
          {error || "The requested thread may have been deleted or does not exist."}
        </p>
        <div>
          <Button onClick={() => navigate("/")} variant="secondary" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Feed</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[960px] mx-auto py-2 text-left">
      <ThreadView
        thread={thread}
        onBack={handleBack}
        user={user}
        onThreadUpdated={handleThreadUpdated}
      />
      <EditPostModal
        isOpen={Boolean(editingThread)}
        thread={editingThread}
        user={user}
        onClose={() => setEditingThread(null)}
        onSuccess={handleThreadUpdated}
      />
    </div>
  );
}
