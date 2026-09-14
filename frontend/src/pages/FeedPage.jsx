import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getTags } from "../api/client";
import TagBrowser from "../components/nav/TagBrowser";
import ThreadList from "../ThreadList";
import ThreadView from "../ThreadView";

export default function FeedPage({ user: propUser }) {
  const context = useOutletContext();
  const user = propUser || context?.user;

  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);

  useEffect(() => {
    async function loadAllTags() {
      try {
        const data = await getTags();
        setTags(data || []);
      } catch {
        // Fallback or ignore
      }
    }
    loadAllTags();
  }, []);

  if (selectedThread) {
    return (
      <ThreadView
        thread={selectedThread}
        onBack={() => setSelectedThread(null)}
        user={user}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Fast Horizontal Artist & Genre Tag Browser */}
      <TagBrowser
        tags={tags}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />

      {/* Main Threaded Discussions Feed */}
      <ThreadList
        tag={selectedTag}
        tags={tags}
        onSelectTag={setSelectedTag}
        onSelectThread={setSelectedThread}
        user={user}
      />
    </div>
  );
}