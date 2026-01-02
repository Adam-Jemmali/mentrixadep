interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </p>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

