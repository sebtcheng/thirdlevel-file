// Centered page spinner (UI rules: spinners, never skeleton placeholders).
const LoadingSpinner = () => (
  <div className="flex flex-1 min-h-screen items-center justify-center" role="status" aria-label="Loading dashboard">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" />
  </div>
);

export default LoadingSpinner;
