"use client";

import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, Loader2, RefreshCw, X } from "lucide-react";

interface CameraQrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function CameraQrScanner({ onScan, onClose }: CameraQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasScannedRef = useRef(false);

  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let active = true;
    hasScannedRef.current = false;

    const stopCamera = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    const startCamera = async () => {
      setStatus("starting");
      setErrorMessage("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("error");
        setErrorMessage(
          "Camera access is unavailable in this browser context. Use HTTPS or localhost, or type/scan with a USB scanner."
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        setStatus("scanning");

        let lastScanTime = 0;
        const tick = (now: number) => {
          if (!active || hasScannedRef.current) return;
          rafRef.current = requestAnimationFrame(tick);

          // Decode at ~8 fps to stay light on mobile batteries
          if (now - lastScanTime < 120) return;
          lastScanTime = now;

          const v = videoRef.current;
          const canvas = canvasRef.current;
          if (!v || !canvas || v.readyState < 2 || v.videoWidth === 0) return;

          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;

          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code?.data) {
            hasScannedRef.current = true;
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate(80);
              } catch {
                // Ignore vibration errors on unsupported devices
              }
            }
            stopCamera();
            onScan(code.data.trim());
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        if (!active) return;
        setStatus("error");
        if (err?.name === "NotAllowedError") {
          setErrorMessage("Camera permission was denied. Allow camera access in your browser settings and try again.");
        } else if (err?.name === "NotFoundError") {
          setErrorMessage("No camera was detected on this device.");
        } else {
          setErrorMessage(err?.message || "Could not start camera.");
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [facingMode, onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-pink-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">
              Backstage QR Scanner
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
              }
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              title="Flip camera"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              aria-label="Close scanner"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`w-full h-full object-cover ${status === "error" ? "hidden" : ""}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {status === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-300 bg-black/60">
              <Loader2 size={28} className="animate-spin text-pink-500" />
              <span className="text-xs font-bold uppercase tracking-widest">Starting camera…</span>
            </div>
          )}

          {status === "scanning" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-52 h-52 rounded-2xl border-2 border-pink-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative">
                <div className="absolute inset-x-3 top-1/2 h-0.5 bg-pink-500/80 animate-pulse" />
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-6 text-center space-y-3">
              <CameraOff size={36} className="mx-auto text-zinc-600" />
              <p className="text-xs text-zinc-300 leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-zinc-900/60 border-t border-white/5 text-center">
          <p className="text-[11px] font-medium text-zinc-400">
            Point your camera at any printed Open Backstage garment QR tag to pull up its bin &amp;
            measurements instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
