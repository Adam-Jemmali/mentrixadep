"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassTimeCardProps {
  time?: Date | string;
  showSeconds?: boolean;
  showTimezone?: boolean;
  className?: string;
  staticTime?: boolean;
}

export function GlassTimeCard(props: GlassTimeCardProps) {
  const { time, showSeconds = false, showTimezone = false, className, staticTime = false } = props;
  
  const [currentTime, setCurrentTime] = useState<Date>(time ? new Date(time) : new Date());
  const [timezoneName, setTimezoneName] = useState<string>("");
  
  useEffect(() => {
    const timezoneOffset = new Date().getTimezoneOffset();
    const timezoneShorter = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -timezoneOffset / 60;
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    
    setTimezoneName(`${timezoneShorter} GMT${offsetStr}`);
    
    if (!staticTime && !time) {
      const intervalId = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [staticTime, time]);
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: true
    });
  };
  
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[date.getDay()];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    
    return `${weekday} | ${month} ${day}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={cn(
        "w-full text-white bg-white/5 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-xl p-6 rounded-2xl border border-white/20",
        className
      )}
    >
      <div className="flex flex-col gap-1 items-center">
        <div className="text-sm font-medium tracking-widest text-white/70 uppercase mb-2">{formatDate(currentTime)}</div>
        <div className="text-6xl font-bold tabular-nums tracking-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          {formatTime(currentTime)}
        </div>
        {showTimezone && (
          <div className="text-xs text-white/50 mt-2 font-medium">{timezoneName}</div>
        )}
      </div>
    </motion.div>
  )
}
