import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import TagList from "../TagList";
import ThreadList from "../ThreadList";
import ThreadView from "../ThreadView";

export default function FeedPage({ user: propUser }) {
  const context = useOutletContext();
  const user = propUser || context?.user;

  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);

  if (selectedThread) {
    return (
      <ThreadView
        thread={selectedThread}
        onBack={() => setSelectedThread(null)}
        user={user}
      />
    );
  }

  if (selectedTag) {
    return (
      <ThreadList
        tag={selectedTag}
        onSelectThread={setSelectedThread}
        onBack={() => setSelectedTag(null)}
        user={user}
      />
    );
  }

  return <TagList onSelectTag={setSelectedTag} user={user} />;
}