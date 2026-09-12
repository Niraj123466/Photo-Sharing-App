"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatFileSize } from "@/lib/utils";
import { useParams } from "next/navigation";
import {
  Camera,
  Check,
  CheckSquare,
  Square,
  Search,
  ChevronLeft,
  Filter,
  Save,
  Clock,
  User,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, filter]);

  async function loadData() {
    setLoading(true);
    setPhotos([]);
    setCursor(null);

    try {
      const [photosRes, galleryRes] = await Promise.all([
        fetch(
          `/api/events/${eventId}/photos?limit=100${
            filter.status ? `&status=${filter.status}` : ""
          }${filter.search ? `&search=${encodeURIComponent(filter.search)}` : ""}`
        ),
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
        const galPhotosRes = await fetch(`/api/events/${eventId}/photos?limit=500`);
        const galPhotosData = await galPhotosRes.json();
        if (galPhotosData.success) {
          const galIds = new Set<string>(
            galPhotosData.data
              .filter((p: Photo) => p.galleries.length > 0)
              .map((p: Photo) => p.id)
          );
          setSelected(galIds);
        }
      }
    } finally {
      setLoading(false);
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
      toast.error("Please create a client gallery first from the Gallery tab.");
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
      toast.success(`Gallery updated with ${selected.size} curated photos!`);
      // Update local gallery photo cache tags
      setPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          galleries: selected.has(p.id) ? [{ galleryId: gallery.id }] : [],
        }))
      );
    } catch {
      toast.error("Failed to save gallery selection.");
    } finally {
      setSaving(false);
    }
  }

  const readyPhotos = photos.filter((p) => p.status === "READY");

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-24">
      {/* Workstation Header */}
      <div className="pb-5 border-b border-white/[0.08]">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to Event Details</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-[4px]">
                CURATION WORKSTATION
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">
              Photo Review &amp; Selection
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 mt-0.5">
              Select which cloud-ingested photos will be published to the client’s private gallery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select All Ready ({readyPhotos.length})</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={clearAll}>
              <Square className="w-3.5 h-3.5" />
              <span>Clear</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-[8px] border border-white/[0.08] bg-[#0D0E15]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by filename..."
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            className="pl-8 h-8 text-xs bg-[#090A0F]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-[6px] border border-white/[0.1] bg-[#090A0F] px-2.5 text-xs text-slate-300 focus-visible:outline-none focus-visible:border-indigo-500"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="READY">Ready for Gallery</option>
            <option value="UPLOADING">Uploading / Ingesting</option>
            <option value="FAILED">Processing Failed</option>
          </select>

          <Button variant="ghost" size="sm" onClick={loadData} className="h-8 px-2 text-slate-400 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-[8px] skeleton border border-white/[0.06]" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 rounded-[8px] border border-dashed border-white/[0.08] bg-[#0D0E15]/50">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Camera className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-200">No photos found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Photographers have not uploaded photos to this event yet, or no photos matched your filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {photos.map((photo) => {
            const isSelected = selected.has(photo.id);
            const isReady = photo.status === "READY";

            return (
              <div
                key={photo.id}
                onClick={() => isReady && toggleSelect(photo.id)}
                className={cn(
                  "group relative aspect-[4/3] rounded-[8px] overflow-hidden border transition-all duration-200 bg-[#090A0F] cursor-pointer select-none",
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-[0_0_16px_rgba(99,102,241,0.3)]"
                    : "border-white/[0.08] hover:border-white/[0.22] hover:translate-y-[-1px]"
                )}
              >
                {/* Photo Thumbnail */}
                {photo.thumbnailUrl ? (
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.originalFilename}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#141622] text-slate-400 p-3 text-center">
                    <Camera className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-[10px] font-mono truncate max-w-full">
                      {photo.status === "UPLOADING" ? "Ingesting..." : photo.originalFilename}
                    </span>
                  </div>
                )}

                {/* Top Corner Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-[4px] border flex items-center justify-center transition-all",
                      isSelected
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                        : "bg-black/60 backdrop-blur-sm border-white/30 text-transparent group-hover:border-white/60"
                    )}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Status indicator pill if not READY */}
                {!isReady && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant={photo.status === "FAILED" ? "destructive" : "warning"}>
                      {photo.status}
                    </Badge>
                  </div>
                )}

                {/* Bottom Metadata Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-[10px] text-slate-200">
                  <span className="truncate max-w-[120px] font-mono">{photo.originalFilename}</span>
                  <span className="font-mono text-slate-400">{formatFileSize(photo.fileSize)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar at Bottom */}
      <div className="fixed bottom-5 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4 px-4 py-2.5 rounded-[10px] border border-white/[0.14] bg-[#0D0E15]/95 backdrop-blur-md shadow-[0_16px_36px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-slate-300">Selected:</span>
            <span className="font-bold text-slate-100">{selected.size}</span>
            <span className="text-slate-400">/ {photos.length}</span>
          </div>

          <div className="h-4 w-px bg-white/[0.1]" />

          <Button
            size="sm"
            onClick={saveSelection}
            loading={saving}
            className="h-8 px-3.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Client Gallery</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
