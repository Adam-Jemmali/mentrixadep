export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 rounded-full`}
      style={{
        animation: "spin 1s linear infinite",
      }}
    />
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingState />
    </div>
  );
}

