"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Video,
  Square,
  Upload,
  RefreshCw,
  Check,
  Camera,
  Loader2,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { toast } from "@/app/components/ToastProvider";
import {
  inferUploadMimeType,
  pickPreferredVideoMimeType,
  type VideoKind,
} from "@/app/lib/audition-workflow-helpers";

interface VideoRecorderModalProps {
  tenant: string;
  subjectLabel: string;
  videoKind: VideoKind;
  onSaved: (publicUrl: string) => Promise<void> | void;
  onClose: () => void;
}

const KIND_LABELS: Record<VideoKind, string> = {
  audition: "Audition Tape",
  dance: "Dance Video",
  callback: "Callback Tape",
};

function uploadWithProgress(
  uploadUrl: string,
  file: Blob,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-amz-acl", "public-read");

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Storage upload failed (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading video."));
    xhr.send(file);
  });
}

export default function VideoRecorderModal({
  tenant,
  subjectLabel,
  videoKind,
  onSaved,
  onClose,
}: VideoRecorderModalProps) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime] = useState("video/webm");
  const [recordedExt, setRecordedExt] = useState("webm");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mode !== "camera" || previewUrl) {
      stopStream();
      return;
    }

    let cancelled = false;
    (async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError(
            "In-browser camera recording is not supported on this device. Use Upload / Camera Roll instead."
          );
          setMode("upload");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          await liveVideoRef.current.play().catch(() => {});
        }
        setCameraError(null);
        setCameraReady(true);
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.name === "NotAllowedError"
            ? "Camera/microphone permission was denied. Allow access in browser settings or use Upload Video."
            : "Could not access camera. Check if another app is using it, or use Upload Video.";
        setCameraReady(false);
        setCameraError(msg);
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [mode, previewUrl, facingMode, stopStream]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    if (typeof MediaRecorder === "undefined") {
      setCameraError("MediaRecorder is not available in this browser. Use Upload / Native Camera.");
      setMode("upload");
      return;
    }

    const picked = pickPreferredVideoMimeType((m) => MediaRecorder.isTypeSupported(m));
    setRecordedMime(picked.mimeType);
    setRecordedExt(picked.extension);
    chunksRef.current = [];

    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: picked.mimeType,
        videoBitsPerSecond: 2_500_000,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          chunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: picked.mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopStream();
      };

      recorder.start(1000);
      setIsRecording(true);
      setElapsedSec(0);
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("MediaRecorder start error:", err);
      toast.error("Could not start recording. Try Upload / Native Camera.");
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setElapsedSec(0);
  };

  const uploadBlobAndSave = async (blob: Blob, filename: string, rawType: string) => {
    setIsUploading(true);
    setUploadPct(2);
    try {
      const mimeType = inferUploadMimeType(filename, rawType) || "video/mp4";
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          fileType: mimeType,
          tenant,
          folder: "auditions",
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.uploadUrl) {
        throw new Error(presignData.error || "Could not prepare video upload.");
      }

      await uploadWithProgress(
        presignData.uploadUrl,
        blob,
        presignData.contentType || mimeType,
        setUploadPct
      );

      await onSaved(presignData.publicUrl);
      toast.success(`${KIND_LABELS[videoKind]} saved!`);
      onClose();
    } catch (err: any) {
      console.error("Video upload error:", err);
      toast.error(err?.message || "Video upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveRecorded = async () => {
    if (!recordedBlob) return;
    const safeName = `${videoKind}-${subjectLabel.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 32)}.${recordedExt}`;
    await uploadBlobAndSave(recordedBlob, safeName, recordedMime);
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filename = `${videoKind}-${file.name}`;
    await uploadBlobAndSave(file, filename, file.type);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6"
      onClick={() => !isUploading && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-zinc-900/60 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
              {KIND_LABELS[videoKind]}
            </p>
            <h3 className="text-base md:text-lg font-black uppercase italic text-white truncate">
              {subjectLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
            aria-label="Close Video Recorder"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              handleRetake();
              setMode("camera");
            }}
            disabled={isUploading || isRecording}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-colors ${
              mode === "camera"
                ? "bg-blue-600 border-blue-400 text-white"
                : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <Camera size={14} /> Live Camera
          </button>
          <button
            type="button"
            onClick={() => {
              handleRetake();
              setMode("upload");
            }}
            disabled={isUploading || isRecording}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-colors ${
              mode === "upload"
                ? "bg-blue-600 border-blue-400 text-white"
                : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <Upload size={14} /> Upload / Camera Roll
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {mode === "camera" ? (
            <>
              <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : cameraError ? (
                  <div className="p-6 text-center space-y-3">
                    <AlertCircle size={32} className="text-amber-500 mx-auto" />
                    <p className="text-xs text-zinc-300 max-w-md mx-auto">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setMode("upload")}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-white"
                    >
                      Switch to Upload / Native Camera
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={liveVideoRef}
                      muted
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    {!cameraReady && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-2">
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                        <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                          Starting Camera...
                        </span>
                      </div>
                    )}
                    {isRecording && (
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black tracking-wider shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        REC {formatTimer(elapsedSec)}
                      </div>
                    )}
                    {!isRecording && cameraReady && (
                      <button
                        type="button"
                        onClick={() =>
                          setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
                        }
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 text-[10px] font-bold uppercase text-white flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} /> Flip Camera
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Camera Controls */}
              {!previewUrl ? (
                <div className="flex items-center justify-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={!cameraReady || Boolean(cameraError)}
                      className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-red-900/30 active:scale-95 transition-all"
                    >
                      <Video size={16} /> Start Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <Square size={14} fill="currentColor" /> Stop Recording ({formatTimer(elapsedSec)})
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={isUploading}
                    className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <RefreshCw size={14} /> Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRecorded}
                    disabled={isUploading}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-60"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Uploading {uploadPct}%
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Upload & Save Tape
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <label
                className={`block w-full p-6 rounded-2xl border-2 border-dashed border-white/15 bg-zinc-900/50 hover:bg-zinc-900 hover:border-blue-500/50 transition-all text-center cursor-pointer ${
                  isUploading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <Upload size={28} className="mx-auto text-blue-400 mb-2" />
                <p className="text-sm font-black uppercase text-white">
                  Choose Video File / Camera Roll
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  MP4, MOV, or WebM from desktop or phone library
                </p>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFilePicked}
                  disabled={isUploading}
                />
              </label>

              <label
                className={`block w-full p-4 rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 transition-all text-center cursor-pointer ${
                  isUploading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <Smartphone size={15} /> Open Native Mobile Camera
                </span>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFilePicked}
                  disabled={isUploading}
                />
              </label>
            </div>
          )}

          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                <span>Uploading to cloud storage...</span>
                <span>{uploadPct}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
