import QuiltGallery from "../QuiltGallery";
import ErrorBoundary from "../components/ErrorBoundary";

export default function TopstersPage() {
  return (
    <div className="w-full max-w-[1020px] mx-auto">
      <ErrorBoundary>
        <QuiltGallery />
      </ErrorBoundary>
    </div>
  );
}
