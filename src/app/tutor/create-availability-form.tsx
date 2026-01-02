"use client";

import { useState } from "react";
import { createAvailability } from "@/app/actions/tutor";
import { useRouter } from "next/navigation";

export function CreateAvailabilityForm() {
  const [showForm, setShowForm] = useState(false);
  const [course, setCourse] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!course || !date || !time) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    const startTime = new Date(`${date}T${time}:00`);

    try {
      await createAvailability(course, startTime.toISOString());
      setCourse("");
      setDate("");
      setTime("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create availability");
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
      >
        + Add Availability
      </button>
    );
  }

  return (
    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 space-y-4 shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Create Availability Slot</h3>
        <button
          onClick={() => {
            setShowForm(false);
            setError(null);
          }}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="course" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Course
          </label>
          <input
            id="course"
            type="text"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            required
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
            placeholder="e.g., Mathematics, Physics"
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
          />
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Start Time (24-hour format)
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
          />
        </div>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-3">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all"
          >
            {loading ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setError(null);
            }}
            className="px-4 py-2.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

