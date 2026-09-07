"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils";
import { useParams } from "next/navigation";

type Photo = {
  id: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  width?: number;
  height?: number;
  status: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string; email: string };
  galleries: { galleryId: string }[];
};

type GalleryInfo = {
  id: string;
  status: string;
  _count: { photos: number };
} | null;

export default function PhotosPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState<GalleryInfo>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState({ search: "", status: "", uploadedById: "" });
  const [totalSelected, setTotalSelected] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    setPhotos([]);
    setCursor(null);

    try {
      const [photosRes, galleryRes] = await Promise.all([
        fetch(`/api/events/${eventId}/photos?limit=50${filter.status ? `&status=${filter.status}` : ""}${filter.search ? `&search=${encodeURIComponent(filter.search)}` : ""}`),
        fetch(`/api/events/${eventId}/gallery`),
      ]);

      const photosData = await photosRes.json();
      const galleryData = await galleryRes.json();

      if (photosData.success) {
        setPhotos(photosData.data);
        setCursor(photosData.pagination?.nextCursor ?? null);
        setHasMore(photosData.pagination?.hasMore ?? false);
      }
      if (galleryData.success && galleryData.data) {
        setGallery(galleryData.data);
        // Mark already selected photos
        const galPhotosRes = await fetch(`/api/events/${eventId}/photos?limit=500`);
        const galPhotosData = await galPhotosRes.json();
        if (galPhotosData.success) {
          const galIds = new Set<string>(
            galPhotosData.data
              .filter((p: Photo) => p.galleries.length > 0)
              .map((p: Photo) => p.id)
          );
          setSelected(galIds);
          setTotalSelected(galIds.size);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/events/${eventId}/photos?limit=50&cursor=${cursor}`);
      const data = await res.json();
      if (data.success) {
        setPhotos((prev) => [...prev, ...data.data]);
        setCursor(data.pagination?.nextCursor ?? null);
        setHasMore(data.pagination?.hasMore ?? false);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSelect(photoId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(photos.filter((p) => p.status === "READY").map((p) => p.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function saveSelection() {
    if (!gallery) {
      toast.error("Create a gallery first from the Gallery tab.");
      return;
    }
    setSaving(true);
    try {
      const selectedIds = Array.from(selected);
      const alreadyInGallery = photos
        .filter((p) => p.galleries.length > 0)
        .map((p) => p.id);
      const toAdd = selectedIds.filter((id) => !alreadyInGallery.includes(id));
      const toRemove = alreadyInGallery.filter((id) => !selected.has(id));

      if (toAdd.length > 0) {
        await fetch(`/api/events/${eventId}/photos/bulk-select`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: toAdd, galleryId: gallery.id }),
        });
      }
      if (toRemove.length > 0) {
        await fetch(`/api/events/${eventId}/photos/bulk-unselect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: toRemove, galleryId: gallery.id }),
        });
      }
      setTotalSelected(selected.size);
      toast.success(`Gallery updated: ${selected.size} photos selected.`);
    } catch {
      toast.error("Failed to save selection.");
    } finally {
      setSaving(false);
    }
  }

  const readyPhotos = photos.filter((p) => p.status === "READY");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href={`/events/${eventId}`} className="text-muted-foreground hover:text-foreground text-sm">← Event</Link>
          <h1 className="text-2xl font-bold mt-1">Photo Review</h1>
          <p className="text-muted-foreground text-sm">
            {photos.length} photos loaded · {selected.size} selected · {readyPhotos.length} ready
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select All Ready</Button>
          <Button variant="outline" size="sm" onClick={clearAll}>Clear</Button>
          <Button size="sm" onClick={saveSelection} loading={saving}>
            Save Selection ({selected.size})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
          placeholder="Search filename..."
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="READY">Ready</option>
          <option value="UPLOADING">Uploading</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Photo grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl skeleton" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📷</div>
          <p>No photos uploaded yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                isSelected={selected.has(photo.id)}
                onToggle={() => toggleSelect(photo.id)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={loadMore} loading={loadingMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PhotoTile({
  photo,
  isSelected,
  onToggle,
}: {
  photo: Photo;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const isReady = photo.status === "READY";

  return (
    <div
      className={cn(
        "relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200",
        isSelected ? "border-primary shadow-lg shadow-primary/20" : "border-transparent",
        !isReady && "opacity-50 cursor-not-allowed"
      )}
      onClick={isReady ? onToggle : undefined}
    >
      {photo.thumbnailUrl ? (
        <Image
          src={photo.thumbnailUrl}
          alt={photo.originalFilename}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-4xl">
          {photo.status === "UPLOADING" ? "⏳" : photo.status === "FAILED" ? "❌" : "📷"}
        </div>
      )}

      {/* Selection overlay */}
      <div className={cn(
        "absolute inset-0 transition-all duration-200",
        isSelected ? "bg-primary/20" : "bg-transparent group-hover:bg-black/20"
      )}>
        <div className={cn(
          "absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          isSelected
            ? "bg-primary border-primary"
            : "border-white/70 bg-black/30"
        )}>
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </div>
      </div>

      {/* Info overlay on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{photo.originalFilename}</p>
        <p className="text-white/70 text-xs">{photo.uploadedBy.name} · {formatFileSize(photo.fileSize)}</p>
      </div>

      {/* Status badge for non-ready */}
      {!isReady && (
        <div className="absolute top-2 right-2">
          <Badge variant={photo.status === "FAILED" ? "destructive" : "warning"}>
            {photo.status}
          </Badge>
        </div>
      )}
    </div>
  );
}
