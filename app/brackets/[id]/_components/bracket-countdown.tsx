"use client";

import { useState, useEffect } from "react";

interface BracketCountdownProps {
  bracketName: string;
  lockDate: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function BracketCountdown({
  bracketName,
  lockDate,
}: BracketCountdownProps) {
  const [diff, setDiff] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  } | null>(null);

  useEffect(() => {
    const target = new Date(lockDate).getTime();

    function tick() {
      const now = Date.now();
      const totalMs = Math.max(0, target - now);

      if (totalMs <= 0) {
        setDiff({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        return;
      }

      const seconds = Math.floor((totalMs / 1000) % 60);
      const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
      const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
      const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

      setDiff({ days, hours, minutes, seconds, totalMs });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockDate]);

  if (diff === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (diff.totalMs === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <p className="text-2xl text-stone-300">The bracket is now visible!</p>
        <p className="text-muted-foreground text-sm">
          Refresh the page to view it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4">
      <div className="mb-12 text-center">
        <h1 className="text-2xl font-semibold text-stone-200 sm:text-3xl">
          {bracketName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          This bracket will be revealed when the games begin
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
        <TimeBlock value={pad(diff.days)} label="Days" />
        <TimeBlock value={pad(diff.hours)} label="Hours" />
        <TimeBlock value={pad(diff.minutes)} label="Minutes" />
        <TimeBlock value={pad(diff.seconds)} label="Seconds" />
      </div>

      <p className="mt-16 text-center text-sm text-muted-foreground">
        Lock date: {new Date(lockDate).toLocaleString(undefined, {
          dateStyle: "full",
          timeStyle: "short",
        })}
      </p>
    </div>
  );
}

function TimeBlock({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-32 w-28 items-center justify-center rounded-2xl border-2 border-accent/30 bg-card sm:h-40 sm:w-36"
        style={{
          boxShadow: "0 0 40px rgba(194, 85, 10, 0.15)",
        }}
      >
        <span
          className="font-mono text-6xl font-bold tabular-nums text-accent sm:text-7xl"
          style={{
            textShadow: "0 0 40px rgba(194, 85, 10, 0.4)",
          }}
        >
          {value}
        </span>
      </div>
      <span className="mt-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
