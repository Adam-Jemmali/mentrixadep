import { requireRole } from "@/lib/auth";
import { getRegistrationRequests } from "@/app/actions/admin";
import { RegistrationRequest } from "@/lib/database.types";
import { RegistrationActions } from "./registration-actions";

export default async function AdminPage() {
  const user = await requireRole("admin");
  const requests = await getRegistrationRequests();

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const otherRequests = requests?.filter((r) => r.status !== "pending") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {user.email?.split("@")[0]} • Manage the platform
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Pending Registration Requests
            </h2>
            {pendingRequests.length === 0 ? (
              <div className="py-12">
                <p className="text-center text-gray-600 dark:text-gray-400">
                  No pending registration requests
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <RegistrationRequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </section>

          {otherRequests.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Processed Requests
              </h2>
              <div className="space-y-3">
                {otherRequests.map((request) => (
                  <RegistrationRequestCard key={request.id} request={request} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function RegistrationRequestCard({ request }: { request: RegistrationRequest }) {
  const isPending = request.status === "pending";
  const statusColors = {
    pending: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    approved: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    rejected: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  return (
    <div
      className={`border-2 rounded-xl p-5 sm:p-6 ${statusColors[request.status]} hover:shadow-lg transition-all`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            request.role === "tutor"
              ? "bg-gradient-to-br from-blue-500 to-blue-600"
              : "bg-gradient-to-br from-purple-500 to-purple-600"
          }`}>
            <span className="text-white font-bold text-xl">
              {request.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{request.email}</h3>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                  request.role === "tutor"
                    ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-800 dark:text-blue-200"
                    : "bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 text-purple-800 dark:text-purple-200"
                }`}
              >
                {request.role}
              </span>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                  request.status === "pending"
                    ? "bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 text-yellow-800 dark:text-yellow-200"
                    : request.status === "approved"
                    ? "bg-gradient-to-r from-green-100 to-emerald-200 dark:from-green-900/40 dark:to-emerald-800/40 text-green-800 dark:text-green-200"
                    : "bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 text-red-800 dark:text-red-200"
                }`}
              >
                {request.status}
              </span>
            </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Requested: {new Date(request.created_at).toLocaleString()}
          </p>
          {request.updated_at !== request.created_at && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Updated: {new Date(request.updated_at).toLocaleString()}
            </p>
          )}
        </div>
        {isPending && (
          <div className="flex gap-2">
            <RegistrationActions requestId={request.id} />
          </div>
        )}
      </div>
    </div>
  );
}
