"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Camera,
  ChevronLeft,
  Trash2,
  FileImage,
  Layers,
} from "lucide-react";

type UploadFile = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "complete" | "error";
  progress: number;
  error?: string;
  photoId?: string;
};

type ExistingPhoto = {
  id: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  createdAt: string;
};

const MAX_CONCURRENT = 3;

export function UploadClient({
  event,
  myPhotos: initialPhotos,
}: {
  event: { id: string; name: string; status: string };
  myPhotos: ExistingPhoto[];
}) {
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [myPhotos, setMyPhotos] = useState(initialPhotos);
  const activeUploads = useRef(0);

  const processQueue = useCallback(
    async (queue: UploadFile[]) => {
      const pending = queue.filter((f) => f.status === "pending");

      while (activeUploads.current < MAX_CONCURRENT && pending.length > 0) {
        const file = pending.shift()!;
        activeUploads.current++;
        uploadFile(file);
      }
    },
    []
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "pending",
        progress: 0,
      }));

      setUploadQueue((prev) => {
        const updated = [...prev, ...newFiles];
        setTimeout(() => processQueue(updated), 0);
        return updated;
      });
    },
    [processQueue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    maxSize: 52428800,
    multiple: true,
  });

  async function uploadFile(uploadFile: UploadFile) {
    const updateFile = (updates: Partial<UploadFile>) => {
      setUploadQueue((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, ...updates } : f))
      );
    };

    updateFile({ status: "uploading", progress: 10 });

    try {
      const contentType =
        uploadFile.file.type ||
        (uploadFile.file.name.toLowerCase().endsWith(".png")
          ? "image/png"
          : uploadFile.file.name.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg");

      // Step 1: Get presigned URL
      const presignRes = await fetch(`/api/events/${event.id}/photos/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadFile.file.name,
          contentType,
          fileSize: uploadFile.file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignData.error?.message ?? "Failed to get upload URL.");
      }

      updateFile({ progress: 30 });

      // Step 2: Upload directly to R2/S3 using XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = 30 + Math.round((e.loaded / e.total) * 60);
            updateFile({ progress });
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
        xhr.open("PUT", presignData.data.presignedUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(uploadFile.file);
      });

      updateFile({ progress: 95 });

      // Step 3: Notify server upload is complete
      const completeRes = await fetch(`/api/events/${event.id}/photos/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: presignData.data.photoId }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to confirm upload.");
      }

      updateFile({ status: "complete", progress: 100, photoId: presignData.data.photoId });

      // Add to my photos list
      setMyPhotos((prev) => [
        {
          id: presignData.data.photoId,
          originalFilename: uploadFile.file.name,
          fileSize: uploadFile.file.size,
          status: "READY",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (error) {
      updateFile({
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      activeUploads.current--;
      // Process remaining queue items
      setUploadQueue((current) => {
        const pending = current.filter((f) => f.status === "pending");
        if (pending.length > 0) {
          setTimeout(() => processQueue(current), 0);
        }
        return current;
      });
    }
  }

  function retryUpload(uploadFileId: string) {
    setUploadQueue((prev) => {
      const updated = prev.map((f) =>
        f.id === uploadFileId
          ? { ...f, status: "pending" as const, progress: 0, error: undefined }
          : f
      );
      setTimeout(() => processQueue(updated), 0);
      return updated;
    });
  }

  function clearCompleted() {
    setUploadQueue((prev) => prev.filter((f) => f.status !== "complete"));
  }

  const uploading = uploadQueue.filter((f) => f.status === "uploading").length;
  const pending = uploadQueue.filter((f) => f.status === "pending").length;
  const completed = uploadQueue.filter((f) => f.status === "complete").length;
  const failed = uploadQueue.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-16">
      {/* Header */}
      <div className="pb-5 border-b border-white/[0.08]">
        <Link
          href="/my-events"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to My Events</span>
        </Link>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">
            Upload Event Photos
          </h1>
          <Badge variant={event.status === "ACTIVE" ? "success" : "secondary"} dot={event.status === "ACTIVE"}>
            {event.status}
          </Badge>
        </div>
        <p className="text-xs lg:text-sm text-slate-400 mt-0.5">
          {event.name} · Direct high-speed upload to cloud storage
        </p>
      </div>

      {/* Pro Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-[10px] p-10 text-center cursor-pointer transition-all duration-200 select-none",
          isDragActive
            ? "border-indigo-500 bg-indigo-500/[0.08] shadow-[0_0_24px_rgba(99,102,241,0.25)] scale-[1.005]"
            : "border-white/[0.12] bg-[#0D0E15] hover:border-indigo-500/50 hover:bg-[#141622]/40"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-200">
          {isDragActive ? "Release files to begin direct upload..." : "Drag & drop photo batches here"}
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          or click to browse from device. Supports JPG, PNG, WebP up to 50MB per image.
        </p>
      </div>

      {/* Upload Queue Progress */}
      {uploadQueue.length > 0 && (
        <div className="space-y-3 p-4 rounded-[8px] border border-white/[0.08] bg-[#0D0E15]">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs font-mono">
              {uploading > 0 && (
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {uploading} uploading
                </span>
              )}
              {pending > 0 && (
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {pending} queued
                </span>
              )}
              {completed > 0 && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completed} synced
                </span>
              )}
              {failed > 0 && (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {failed} failed
                </span>
              )}
            </div>

            {completed > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted} className="h-6 text-[11px] px-2 text-slate-400">
                Clear completed
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {uploadQueue.map((uf) => (
              <div
                key={uf.id}
                className="p-2.5 rounded-[6px] border border-white/[0.06] bg-[#090A0F] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FileImage className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-200 truncate">{uf.file.name}</p>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 mt-0.5">
                      <span>{formatFileSize(uf.file.size)}</span>
                      <span>·</span>
                      <span className="capitalize">{uf.status}</span>
                      {uf.error && <span className="text-rose-400 truncate">({uf.error})</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {uf.status === "uploading" && (
                    <div className="w-24 bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full transition-all duration-200 rounded-full"
                        style={{ width: `${uf.progress}%` }}
                      />
                    </div>
                  )}

                  {uf.status === "complete" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}

                  {uf.status === "error" && (
                    <button
                      onClick={() => retryUpload(uf.id)}
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Retry upload"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Uploaded Photos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            My Uploaded Photos ({myPhotos.length})
          </h2>
          <span className="text-xs font-mono text-slate-400">Processed by Sharp</span>
        </div>

        {myPhotos.length === 0 ? (
          <div className="text-center py-12 rounded-[8px] border border-dashed border-white/[0.08] text-slate-400 text-xs">
            No photos uploaded yet for this event. Drag &amp; drop files above to start.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {myPhotos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center justify-between p-3 rounded-[6px] border border-white/[0.06] bg-[#0D0E15] text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-slate-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 truncate">{photo.originalFilename}</p>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                      {formatFileSize(photo.fileSize)} · {formatRelativeTime(photo.createdAt)}
                    </p>
                  </div>
                </div>

                <Badge variant={photo.status === "READY" ? "success" : "warning"} dot={photo.status === "READY"}>
                  {photo.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
