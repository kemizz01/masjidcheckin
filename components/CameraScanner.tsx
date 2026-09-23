"use client";

// ---------------------------------------------------------------------------
// CameraScanner
//
// A reusable, mobile-first camera component that:
//   1. Opens the device camera via `navigator.mediaDevices.getUserMedia`.
//   2. Renders a live `<video>` preview with a decorative framing guide
//      (oval for face scans, rounded rectangle for scene/room scans).
//   3. Exposes an imperative `capture()` method (via `forwardRef`) that
//      draws the current video frame onto a hidden `<canvas>` and returns
//      it as a Base64 JPEG data URL.
//   4. Supports an optional **auto-capture loop** that fires `onCapture`
//      at a configurable interval (defaults to `null` = disabled).
//
// AI processing is NOT done here — this component only captures images.
// All recognition is triggered by the parent passing the Base64 payload
// to the backend APIs.
// ---------------------------------------------------------------------------

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Camera,
  CameraOff,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Public methods exposed via the ref. */
export interface CameraScannerHandle {
  /** Take a snapshot and return it as a Base64 JPEG data URL. */
  capture: () => string | null;
  /** (Re)open the camera stream (useful after a permission error). */
  start: () => Promise<void>;
  /** Stop the stream and release the camera. */
  stop: () => void;
}

type FacingMode = "user" | "environment";
type GuideType = "face" | "scene";
type StreamStatus = "idle" | "starting" | "active" | "error";

interface CameraScannerProps {
  /** Which framing guide to show. */
  guide?: GuideType;
  /** Front-facing (selfie) or rear-facing camera. */
  facingMode?: FacingMode;
  /** Whether to mirror the live preview (UX convenience for front camera). */
  mirroredPreview?: boolean;
  /** Interval in ms for automatic captures. `null` disables auto-capture. */
  autoCaptureInterval?: number | null;
  /** Called on every capture (auto or manual) with the Base64 image. */
  onCapture?: (image: string) => void;
  /** Additional CSS classes for the outer container. */
  className?: string;
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

const CameraScanner = forwardRef<CameraScannerHandle, CameraScannerProps>(
  function CameraScanner(
    {
      guide = "face",
      facingMode: facingModeProp = "user",
      mirroredPreview = true,
      autoCaptureInterval = null,
      onCapture,
      className,
    },
    ref,
  ) {
    /* ---- state ---- */
    const [status, setStatus] = useState<StreamStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [facingMode, setFacingMode] = useState<FacingMode>(facingModeProp);
    const [flash, setFlash] = useState(false); // brief white overlay on manual snap

    /* ---- refs ---- */
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const facingModeRef = useRef(facingMode);
    /** Keep a latest-stable copy of `onCapture` so the auto-capture effect
     *  doesn't restart every time the parent re-renders. */
    const onCaptureRef = useRef(onCapture);
    /* Track the current `guide` prop for the floating hint text without
     * causing the capture effect to reset. */
    const guideRef = useRef(guide);

    /* sync refs with props */
    useEffect(() => {
      facingModeRef.current = facingMode;
    }, [facingMode]);
    useEffect(() => {
      onCaptureRef.current = onCapture;
    }, [onCapture]);
    useEffect(() => {
      guideRef.current = guide;
    }, [guide]);

    /* ---- imperative methods ------------------------------------------ */

    /** Draw the current video frame onto the hidden canvas and return a
     *  Base64 JPEG data URL (quality 0.8 — good balance of size vs clarity). */
    const capture = useCallback((): string | null => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return null;

      // Have we received enough data to draw a frame?
      // HAVE_CURRENT_DATA === 2; sometimes enums aren't available so use the numeric value.
      if (video.readyState < 2) return null;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return null;

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Note: we intentionally do NOT mirror the captured frame.
      // Mirrored preview (via CSS `-scale-x-100`) is for UX; the raw frame
      // is what the backend AI models expect.
      ctx.drawImage(video, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", 0.8);
    }, []);

    /** Release all camera resources. */
    const stop = useCallback(() => {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStatus("idle");
    }, []);

    /** Request the camera and begin streaming into the <video> element. */
    const start = useCallback(async () => {
      setStatus("starting");
      setErrorMessage("");

      // Clean up any previous stream first.
      stop();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingModeRef.current,
            // Request a resolution that works well on most low-end phones.
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // `play()` returns a promise; in some browsers the video is already
          // playing by this point (autoplay on low-trust sites), so we catch
          // just in case.
          await videoRef.current.play().catch(() => {
            /* muted + playsInline = usually plays fine */
          });
        }

        setStatus("active");
      } catch (err: any) {
        setStatus("error");
        // Map common browser error names to human-readable messages.
        switch (err?.name) {
          case "NotAllowedError":
            setErrorMessage(
              "Camera permission was denied. Please allow camera access in your browser settings.",
            );
            break;
          case "NotFoundError":
            setErrorMessage(
              "No camera found. Make sure your device has a working camera.",
            );
            break;
          case "NotReadableError":
            setErrorMessage(
              "The camera is already in use by another application.",
            );
            break;
          case "OverconstrainedError":
            setErrorMessage(
              "The requested camera settings are not supported on this device.",
            );
            break;
          default:
            setErrorMessage(
              err?.message ?? "An unexpected error occurred while starting the camera.",
            );
        }
      }
    }, [stop]);

    // Expose methods to parent via ref.
    useImperativeHandle(
      ref,
      () => ({ capture, start, stop }),
      [capture, start, stop],
    );

    /* ---- lifecycle ---- */

    // Start the camera on mount; stop on unmount.
    useEffect(() => {
      start();
      return () => {
        stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-capture loop.
    useEffect(() => {
      if (status !== "active" || !autoCaptureInterval) return;
      const id = window.setInterval(() => {
        const img = capture();
        if (img) onCaptureRef.current?.(img);
      }, autoCaptureInterval);
      return () => window.clearInterval(id);
    }, [status, autoCaptureInterval, capture]);

    /* ---- handlers ---- */

    /** Toggle between front and rear cameras. */
    const toggleCamera = useCallback(async () => {
      const next = facingModeRef.current === "user" ? "environment" : "user";
      facingModeRef.current = next;
      setFacingMode(next);
      stop();
      // Small delay to let the hardware release before requesting again
      // (not strictly necessary, but reduces glitches on some Android devices).
      await new Promise((r) => setTimeout(r, 200));
      await start();
    }, [start, stop]);

    /** Manual shutter button press. */
    const handleShutter = useCallback(() => {
      const img = capture();
      // Brief flash effect for tactile feedback.
      setFlash(true);
      setTimeout(() => setFlash(false), 160);
      if (img) onCaptureRef.current?.(img);
    }, [capture]);

    /* ---- render helpers ---- */

    const hintText =
      guideRef.current === "face"
        ? "Position your face inside the frame"
        : "Point the camera at the prayer hall";

    return (
      <div
        className={cn(
          "relative overflow-hidden bg-navy-950",
          "aspect-[3/4] w-full",
          "rounded-2xl sm:rounded-3xl",
          className,
        )}
      >
        {/* ---------- Hidden canvas (used for frame capture) ---------- */}
        <canvas ref={canvasRef} className="hidden" />

        {/* ---------- Flash overlay ---------- */}
        {flash && (
          <div className="pointer-events-none absolute inset-0 z-20 bg-white/60 transition-opacity duration-150" />
        )}

        {/* =================================================================
         *  STATUS: starting (loading spinner)
         * ================================================================= */}
        {status === "starting" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-navy-950/90 text-center sm:rounded-3xl">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gold/30 border-t-gold" />
            <p className="text-sm text-muted">Starting camera…</p>
          </div>
        )}

        {/* =================================================================
         *  STATUS: error
         * ================================================================= */}
        {status === "error" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-navy-950/90 px-6 text-center sm:rounded-3xl">
            <CameraOff className="h-10 w-10 text-muted" />
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {errorMessage || "Could not access the camera."}
            </p>
            <button
              onClick={start}
              className="mt-1 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950 transition active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {/* =================================================================
         *  STATUS: active — video stream + guide overlay
         * ================================================================= */}
        {/* -------- Live video -------- */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "h-full w-full object-cover",
            // Mirror preview for front-facing camera (more natural selfie feel).
            mirroredPreview && facingMode === "user" && "-scale-x-100",
          )}
        />

        {/* -------- Framing guide overlay -------- */}
        {status === "active" && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* The "cutout" — a transparent centre with a dark mask everywhere
                 else, achieved via a massive box-shadow. */}
              <div
                className={cn(
                  "relative",
                  guideRef.current === "face"
                    ? "h-[58%] w-[70%] rounded-full"
                    : "h-[55%] w-[84%] rounded-3xl",
                )}
                style={{
                  boxShadow: "0 0 0 9999px rgba(5, 11, 20, 0.62)",
                }}
              >
                {/* ---- Gold border frame ---- */}
                <div
                  className={cn(
                    "absolute inset-0 border-2",
                    "border-gold/80 shadow-[0_0_12px_rgba(217,169,78,0.2)]",
                    guideRef.current === "face" ? "rounded-full" : "rounded-3xl",
                  )}
                />

                {/* ---- Scanning line (face guide only) ---- */}
                {guideRef.current === "face" && (
                  <div className="absolute inset-x-[15%] top-[12%] h-[2px]">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-gold/80 to-transparent blur-[1px] animate-pulse-slow" />
                  </div>
                )}

                {/* ---- Corner accents (scene guide only) ---- */}
                {guideRef.current === "scene" && (
                  <>
                    {/* top-left */}
                    <div className="pointer-events-none absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-gold/90" />
                    {/* top-right */}
                    <div className="pointer-events-none absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-gold/90" />
                    {/* bottom-left */}
                    <div className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-gold/90" />
                    {/* bottom-right */}
                    <div className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-gold/90" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------- Top hint label -------- */}
        {status === "active" && (
          <div className="pointer-events-none absolute inset-x-0 top-5 z-10 text-center">
            <span className="inline-block rounded-full bg-navy-950/60 px-4 py-1 text-xs text-gold backdrop-blur-sm">
              {hintText}
            </span>
          </div>
        )}

        {/* -------- Bottom controls -------- */}
        {status === "active" && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-6 p-5">
            {/* Switch camera button (hidden if only one camera, but we
               show it unconditionally for simplicity). */}
            <button
              onClick={toggleCamera}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition active:scale-90"
              aria-label="Switch camera"
            >
              <SwitchCamera className="h-5 w-5" />
            </button>

            {/* Shutter button */}
            <button
              onClick={handleShutter}
              className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full transition active:scale-95"
              aria-label="Take photo"
            >
              {/* outer ring */}
              <div className="absolute inset-0 rounded-full border-[3px] border-gold/90" />
              {/* inner circle */}
              <div className="h-[50px] w-[50px] rounded-full bg-white/90 shadow-md" />
            </button>

            {/* Spacer to keep layout symmetrical */}
            <div className="h-10 w-10" />
          </div>
        )}
      </div>
    );
  },
);

export default CameraScanner;