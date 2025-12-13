import {
  LoadingSpinner,
  DashboardLoadingSpinner,
  InlineLoadingSpinner,
} from "./loading-spinner";

// Example component showing different loading variants
export function LoadingExamples() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold">Loading Component Examples</h2>

      {/* Default Loading Spinner */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Default Loading Spinner</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingSpinner size="sm" text="Small loading..." />
          <LoadingSpinner size="md" text="Medium loading..." />
          <LoadingSpinner size="lg" text="Large loading..." />
        </div>
      </div>

      {/* Minimal Loading Spinner */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Minimal Loading Spinner</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingSpinner variant="minimal" size="sm" />
          <LoadingSpinner variant="minimal" size="md" />
          <LoadingSpinner variant="minimal" size="lg" />
        </div>
      </div>

      {/* Dashboard Loading Spinner */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Dashboard Loading Spinner</h3>
        <DashboardLoadingSpinner text="Loading dashboard content..." />
      </div>

      {/* Inline Loading Spinner */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Inline Loading Spinner</h3>
        <div className="flex items-center gap-4">
          <span>Processing...</span>
          <InlineLoadingSpinner />
        </div>
      </div>
    </div>
  );
}

// Usage examples for different scenarios
export const LoadingUsageExamples = {
  // For Suspense fallbacks in dashboard pages
  dashboardSuspense: `<Suspense fallback={<DashboardLoadingSpinner text="Loading dashboard content..." />}>
  <YourComponent />
</Suspense>`,

  // For fullscreen loading (like redirects)
  fullscreenSuspense: `<Suspense fallback={<LoadingSpinner variant="fullscreen" text="Redirecting..." />}>
  <YourComponent />
</Suspense>`,

  // For minimal inline loading
  inlineLoading: `<div className="flex items-center gap-2">
  <span>Processing...</span>
  <InlineLoadingSpinner />
</div>`,

  // For button loading states
  buttonLoading: `<Button disabled>
  <InlineLoadingSpinner className="mr-2" />
  Loading...
</Button>`,

  // For card loading states
  cardLoading: `<Card>
  <CardHeader>
    <CardTitle>Your Content</CardTitle>
  </CardHeader>
  <CardContent>
    <DashboardLoadingSpinner text="Loading content..." />
  </CardContent>
</Card>`,
};
