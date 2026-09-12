"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

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

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
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
      const contentType = uploadFile.file.type || (
        uploadFile.file.name.toLowerCase().endsWith(".png") ? "image/png" :
        uploadFile.file.name.toLowerCase().endsWith(".webp") ? "image/webp" :
        "image/jpeg"
      );

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
          status: "UPLOADING",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (error) {
      updateFile({ status: "error", error: error instanceof Error ? error.message : "Upload failed." });
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
        f.id === uploadFileId ? { ...f, status: "pending" as const, progress: 0, error: undefined } : f
      );
      setTimeout(() => processQueue(updated), 0);
      return updated;
    });
  }

  function clearCompleted() {
    setUploadQueue((prev) => prev.filter((f) => f.status !== "complete"));
  }

  const pending = uploadQueue.filter((f) => f.status === "pending").length;
  const uploading = uploadQueue.filter((f) => f.status === "uploading").length;
  const completed = uploadQueue.filter((f) => f.status === "complete").length;
  const failed = uploadQueue.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/my-events" className="text-muted-foreground hover:text-foreground text-sm">
          ← My Events
        </Link>
        <h1 className="text-2xl font-bold mt-1">Upload Photos</h1>
        <p className="text-muted-foreground text-sm">
          {event.name} · <Badge variant={event.status === "ACTIVE" ? "success" : "secondary"}>{event.status}</Badge>
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">{isDragActive ? "📂" : "📷"}</div>
        <p className="text-lg font-medium">
          {isDragActive ? "Drop your photos here!" : "Drag & drop photos here"}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          or click to browse · JPG, PNG, WebP · Up to 50MB each · Multiple files supported
        </p>
      </div>

      {/* Upload queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
              {uploading > 0 && <span className="text-blue-400">⟳ {uploading} uploading</span>}
              {pending > 0 && <span className="text-yellow-400">⏸ {pending} pending</span>}
              {completed > 0 && <span className="text-green-400">✓ {completed} done</span>}
              {failed > 0 && <span className="text-red-400">✗ {failed} failed</span>}
            </div>
            {completed > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Clear completed
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {uploadQueue.map((uf) => (
              <UploadQueueItem key={uf.id} item={uf} onRetry={() => retryUpload(uf.id)} />
            ))}
          </div>
        </div>
      )}

      {/* My uploaded photos */}
      <div>
        <h2 className="text-lg font-semibold mb-3">My Uploaded Photos ({myPhotos.length})</h2>
        {myPhotos.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center border border-dashed border-border/50 rounded-xl">
            No photos uploaded yet. Use the drop zone above to start uploading!
          </p>
        ) : (
          <div className="space-y-2">
            {myPhotos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
              >
                <div>
                  <p className="text-sm font-medium truncate max-w-xs">{photo.originalFilename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(photo.fileSize)} · {formatRelativeTime(photo.createdAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    photo.status === "READY"
                      ? "success"
                      : photo.status === "FAILED"
                      ? "destructive"
                      : "warning"
                  }
                >
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

function UploadQueueItem({
  item,
  onRetry,
}: {
  item: UploadFile;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/30">
      <div className="text-xl flex-shrink-0">
        {item.status === "complete" ? "✅" :
         item.status === "error" ? "❌" :
         item.status === "uploading" ? "⟳" : "⏸"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
        {item.status === "uploading" && (
          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
        {item.error && (
          <p className="text-xs text-red-400 mt-1">{item.error}</p>
        )}
      </div>
      {item.status === "error" && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
