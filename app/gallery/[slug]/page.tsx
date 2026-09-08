"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

type GalleryInfo = {
  id: string;
  name?: string | null;
  publicSlug: string;
  event: { name: string; eventDate: string; location?: string | null };
  _count: { photos: number };
};

type GalleryPhoto = {
  id: string;
  photoId: string;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string | null;
  optimizedUrl?: string | null;
};

export default function GalleryPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const [galleryInfo, setGalleryInfo] = useState<GalleryInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  useEffect(() => {
    fetchGalleryInfo();
    // Try session on load
    tryExistingSession();
  }, [slug]);

  async function fetchGalleryInfo() {
    try {
      const res = await fetch(`/api/public/gallery/${slug}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      if (data.success) setGalleryInfo(data.data);
      else setNotFound(true);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function tryExistingSession() {
    const res = await fetch(`/api/public/gallery/${slug}/photos?limit=50`);
    if (res.ok) {
      const data = await res.json();
      setVerified(true);
      setPhotos(data.photos ?? []);
      setNextCursor(data.nextCursor);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pinStr = pin.join("");
    if (pinStr.length !== 6) {
      toast.error("Please enter all 6 digits.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`/api/public/gallery/${slug}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinStr }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        const retryAfter = res.headers.get("Retry-After");
        toast.error(`Too many attempts. Try again in ${retryAfter} seconds.`);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setVerified(true);
        loadPhotos();
        toast.success("Access granted! Enjoy the gallery.");
      } else {
        toast.error("Incorrect PIN. Please try again.");
        setPin(["", "", "", "", "", ""]);
        document.getElementById("pin-0")?.focus();
      }
    } finally {
      setVerifying(false);
    }
  }

  async function loadPhotos(cursor?: string) {
    setLoadingPhotos(true);
    try {
      const url = `/api/public/gallery/${slug}/photos?limit=50${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setPhotos((prev) => cursor ? [...prev, ...(data.photos ?? [])] : (data.photos ?? []));
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoadingPhotos(false);
    }
  }

  function handlePinInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    if (digit && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  }

  const lightboxSlides = photos
    .filter((p) => p.optimizedUrl)
    .map((p) => ({
      src: p.optimizedUrl!,
      width: p.width ?? 1920,
      height: p.height ?? 1080,
    }));

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold">Gallery Not Found</h1>
          <p className="text-muted-foreground mt-2">
            This gallery doesn&apos;t exist or is no longer published.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Gallery header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <span className="font-bold gradient-text">FrameVault</span>
          </div>
          {galleryInfo && (
            <div className="text-right">
              <p className="font-semibold text-sm">{galleryInfo.event.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(galleryInfo.event.eventDate).toLocaleDateString("en-US", { dateStyle: "long" })}
                {galleryInfo.event.location && ` · ${galleryInfo.event.location}`}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!verified ? (
          /* PIN Entry */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔐</div>
                <h1 className="text-2xl font-bold">{galleryInfo?.event.name ?? "Private Gallery"}</h1>
                <p className="text-muted-foreground mt-2">
                  Enter the 6-digit PIN to access this gallery
                </p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-6">
                {/* PIN input */}
                <div className="flex justify-center gap-3">
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      id={`pin-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinInput(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      className={cn(
                        "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-card transition-all",
                        digit ? "border-primary text-foreground" : "border-border text-muted-foreground",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      )}
                      aria-label={`PIN digit ${i + 1}`}
                      disabled={rateLimited}
                    />
                  ))}
                </div>

                {rateLimited && (
                  <p className="text-center text-red-400 text-sm">
                    Too many attempts. Please wait before trying again.
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  loading={verifying}
                  disabled={pin.join("").length !== 6 || rateLimited}
                >
                  {verifying ? "Verifying..." : "Access Gallery"}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* Gallery grid */
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">{galleryInfo?.event.name}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {photos.length} photo{photos.length !== 1 ? "s" : ""} · Click any photo to view full-screen
                </p>
              </div>
            </div>

            {loadingPhotos && photos.length === 0 ? (
              <div className="masonry-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`masonry-item skeleton rounded-xl ${i % 3 === 0 ? "h-64" : i % 3 === 1 ? "h-48" : "h-80"}`} />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📷</div>
                <p className="text-muted-foreground">No photos in this gallery yet.</p>
              </div>
            ) : (
              <>
                <div className="masonry-grid">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="masonry-item group relative overflow-hidden rounded-xl cursor-pointer border border-border/30 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.01]"
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    >
                      {photo.thumbnailUrl ? (
                        <Image
                          src={photo.thumbnailUrl}
                          alt={`Photo ${index + 1}`}
                          width={photo.width ?? 400}
                          height={photo.height ?? 300}
                          className="w-full object-cover"
                          loading="lazy"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted flex items-center justify-center text-3xl">📷</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>

                {nextCursor && (
                  <div className="text-center py-4">
                    <Button
                      variant="outline"
                      onClick={() => loadPhotos(nextCursor)}
                      loading={loadingPhotos}
                    >
                      Load More Photos
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Lightbox */}
            <Lightbox
              open={lightboxOpen}
              close={() => setLightboxOpen(false)}
              index={lightboxIndex}
              slides={lightboxSlides}
              on={{
                view: ({ index }) => setLightboxIndex(index),
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
