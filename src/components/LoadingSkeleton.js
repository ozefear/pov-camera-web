export default function LoadingSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
      <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
      <div className="h-10 bg-gray-200 rounded w-full" />
    </div>
  );
}
