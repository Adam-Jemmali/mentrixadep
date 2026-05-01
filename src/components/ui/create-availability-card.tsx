"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronDown, Calendar, Clock, DollarSign, Globe, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAvailabilitySlots } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import { APP_TIMEZONES } from "@/lib/timezones";
import { SESSION_PRICE_CAD_MAX, SESSION_PRICE_CAD_MIN } from "@/lib/availability-schemas";

const WEEKDAYS: { value: number; label: string; full: string }[] = [
  { value: 0, label: "Mon", full: "Monday" },
  { value: 1, label: "Tue", full: "Tuesday" },
  { value: 2, label: "Wed", full: "Wednesday" },
  { value: 3, label: "Thu", full: "Thursday" },
  { value: 4, label: "Fri", full: "Friday" },
  { value: 5, label: "Sat", full: "Saturday" },
  { value: 6, label: "Sun", full: "Sunday" },
];

function timeOptions(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

interface CreateAvailabilityCardProps {
  tutorCourseNames: string[];
  defaultTimezone: string;
  className?: string;
  enableAnimations?: boolean;
}

export function CreateAvailabilityCard({
  tutorCourseNames,
  defaultTimezone,
  className,
  enableAnimations = true,
}: CreateAvailabilityCardProps) {
  // Form State
  const [course, setCourse] = useState(tutorCourseNames[0] || "");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState("12");
  const [price, setPrice] = useState("25");
  const [timezone, setTimezone] = useState(defaultTimezone);
  
  // UI State
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [showConfirmationView, setShowConfirmationView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timezoneRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const times = useMemo(() => timeOptions(), []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
      if (timezoneRef.current && !timezoneRef.current.contains(event.target as Node)) {
        setIsTimezoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDay = (d: number) => {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const handleNext = () => {
    if (!course) {
      setError("Select a subject");
      return;
    }
    if (weekdays.size === 0) {
      setError("Select at least one day");
      return;
    }
    setError(null);
    setShowConfirmationView(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice)) {
      setError("Enter a valid price");
      setLoading(false);
      return;
    }
    if (parsedPrice < SESSION_PRICE_CAD_MIN || parsedPrice > SESSION_PRICE_CAD_MAX) {
      setError(`Price must be between $${SESSION_PRICE_CAD_MIN} and $${SESSION_PRICE_CAD_MAX} CAD`);
      setLoading(false);
      return;
    }

    const rw = Number.parseInt(recurringWeeks, 10);
    if (recurring && (!Number.isFinite(rw) || rw < 1 || rw > 52)) {
      setError("Repeat for 1–52 weeks");
      setLoading(false);
      return;
    }

    const payload = {
      course,
      weekdays: Array.from(weekdays).sort((a, b) => a - b),
      startTime,
      endTime,
      recurring,
      recurringWeeks: recurring ? rw : undefined,
      priceCad: parsedPrice,
      maxStudents: 1 as const,
      timezone,
    };

    try {
      const res = await createAvailabilitySlots(payload, viewingAsUserId ?? undefined);
      if (!res.success) throw new Error(res.error);
      
      // Reset and success
      setWeekdays(new Set());
      setPrice("25");
      setShowConfirmationView(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create availability");
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -25, scale: 0.95, filter: "blur(4px)" },
    visible: {
      opacity: 1, x: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 400, damping: 28, mass: 0.6 }
    },
  };

  const hasCourses = tutorCourseNames.length > 0;

  return (
    <motion.div
      variants={shouldAnimate ? containerVariants : {}}
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      className={cn(
        "bg-[#0F172A] rounded-xl border border-slate-800 shadow-2xl overflow-hidden max-w-2xl relative w-full",
        className
      )}
    >
      <div className="relative h-auto min-h-[500px]">
        {/* Main Content */}
        <motion.div
          initial={false}
          animate={{ 
            y: showConfirmationView ? "-20px" : "0px",
            opacity: showConfirmationView ? 0.3 : 1,
            scale: showConfirmationView ? 0.95 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          className="w-full"
        >
          {/* Header */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
                <Image src={MENTRIXA_LOGO_PNG} alt="Mentrixa" width={24} height={24} className="brightness-0 invert" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Create Availability</h2>
                <p className="text-sm text-slate-400">Set your schedule and expertise</p>
              </div>
            </div>
          </motion.div>

          {/* Subject Selector */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-4 z-50 relative">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Subject
            </label>
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                onClick={() => hasCourses && setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                disabled={!hasCourses}
                className={cn(
                  "w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors h-auto",
                  !hasCourses && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-slate-100">{course || "Add subjects first"}</span>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isSubjectDropdownOpen && "rotate-180")} />
              </Button>
              <AnimatePresence>
                {isSubjectDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[100] overflow-hidden"
                  >
                    {tutorCourseNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => { setCourse(name); setIsSubjectDropdownOpen(false); }}
                        className="w-full text-left p-3 hover:bg-slate-800 transition-colors text-slate-200"
                      >
                        {name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Days Selection */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="px-6 pb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Days
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const isActive = weekdays.has(d.value);
                return (
                  <Button
                    key={d.value}
                    variant={isActive ? "default" : "outline"}
                    onClick={() => toggleDay(d.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg border transition-all duration-200 text-sm font-medium h-auto",
                      isActive 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    {d.label}
                  </Button>
                );
              })}
            </div>
          </motion.div>

          {/* Time & Price Section */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Start Time</label>
                <div className="relative">
                  <select 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {times.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                  </select>
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">End Time</label>
                <div className="relative">
                  <select 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {times.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                  </select>
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Price (CAD/Session)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 pl-9 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                <div className="relative" ref={timezoneRef}>
                  <Button
                    variant="outline"
                    onClick={() => setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-200 h-auto"
                  >
                    <span className="truncate text-xs">{timezone}</span>
                    <Globe className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                  </Button>
                  <AnimatePresence>
                    {isTimezoneDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full left-0 right-0 mb-2 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[100]"
                      >
                        {APP_TIMEZONES.map((tz) => (
                          <button
                            key={tz}
                            onClick={() => { setTimezone(tz); setIsTimezoneDropdownOpen(false); }}
                            className="w-full text-left p-2 text-xs hover:bg-slate-800 transition-colors text-slate-200"
                          >
                            {tz}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recurring Toggle */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="mx-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-slate-100">Repeat weekly</p>
                <p className="text-xs text-slate-400">Keep these slots open for multiple weeks</p>
              </div>
              <button
                type="button"
                onClick={() => setRecurring(!recurring)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
                  recurring ? "bg-primary" : "bg-slate-700"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                  recurring ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>
            <AnimatePresence>
              {recurring && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Repeat for</span>
                    <input 
                      type="number" 
                      value={recurringWeeks}
                      onChange={(e) => setRecurringWeeks(e.target.value)}
                      className="w-16 p-1 text-center bg-slate-900 border border-slate-700 rounded text-sm text-slate-200"
                    />
                    <span className="text-xs text-slate-400">weeks</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-6 border-t border-slate-800">
            <Button
              onClick={handleNext}
              disabled={!hasCourses || weekdays.size === 0}
              size="lg"
              className="w-full font-bold"
            >
              Preview & Create
            </Button>
          </motion.div>
        </motion.div>

        {/* Confirmation View */}
        <motion.div
          initial={false}
          animate={{ 
            y: showConfirmationView ? "0%" : "100%",
            opacity: showConfirmationView ? 1 : 0 
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          className="absolute top-0 left-0 w-full h-full bg-[#0F172A] z-[60]"
        >
          <div className="p-6 space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowConfirmationView(false)} 
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </Button>
              <h3 className="text-lg font-semibold text-white">Review Slots</h3>
              <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-lg text-purple-400 text-primary">{course}</h4>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${price}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Per Session</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{startTime} - {endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>{recurring ? `${recurringWeeks} weeks` : "Once"}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Days selected</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.filter(d => weekdays.has(d.value)).map(d => (
                    <div key={d.value} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-200 flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-400" />
                      {d.full}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 italic leading-relaxed">
                  These slots will be created in your timezone ({timezone}). 
                  Learners will see them converted to their local time.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="lg"
              className="w-full py-7 text-lg font-bold"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "CREATING SLOTS..." : "CONFIRM & CREATE"}
                {!loading && <Check className="w-5 h-5" />}
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
