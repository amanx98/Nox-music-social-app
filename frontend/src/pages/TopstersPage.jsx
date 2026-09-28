import QuiltGallery from "../QuiltGallery";
import ErrorBoundary from "../components/ErrorBoundary";

export default function TopstersPage({ user }) {
  return (
    <div className="w-full max-w-[1020px] mx-auto">
      <ErrorBoundary>
        <QuiltGallery user={user} />
      </ErrorBoundary>
    </div>
  );
}
