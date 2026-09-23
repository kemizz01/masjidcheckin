"use client";

import { Fragment } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StepDefinition {
  /** Unique numeric identifier. */
  id: number;
  /** Short human-readable label, e.g. "Face". */
  label: string;
  /** Lucide icon component to render in the step circle. */
  icon: LucideIcon;
}

/* ================================================================== */
/*  StepsIndicator                                                     */
/* ================================================================== */

interface StepsIndicatorProps {
  steps: StepDefinition[];
  /** The 1‑based index of the currently active step. */
  current: number;
}

/**
 * A horizontal mobile-friendly step progress indicator.
 *
 * Completed steps show a gold circle with a check mark; the active step
 * shows its icon in gold on a transparent background; pending steps remain
 * muted. Connecting lines between steps fill with gold as the user advances.
 */
export default function StepsIndicator({ steps, current }: StepsIndicatorProps) {
  return (
    <nav aria-label="Attendance progress" className="flex w-full items-center">
      {steps.map((s, i) => {
        const isDone = s.id < current;
        const isActive = s.id === current;
        const Icon = s.icon;

        return (
          <Fragment key={s.id}>
            {/* ---------- Step circle + label ---------- */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isDone
                    ? "border-gold bg-gold text-navy-950" // completed
                    : isActive
                      ? "border-gold text-gold"            // current
                      : "border-line/50 text-muted",       // pending
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide uppercase",
                  isActive ? "text-gold" : "text-muted",
                )}
              >
                {s.label}
              </span>
            </div>

            {/* ---------- Connecting line ---------- */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 mb-5 h-0.5 flex-1 rounded-full transition-colors duration-300",
                  isDone ? "bg-gold" : "bg-line/40",
                )}
              />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}