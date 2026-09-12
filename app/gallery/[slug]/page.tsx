"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {
  Lock,
  ShieldCheck,
  Camera,
  Calendar,
  MapPin,
  Share2,
  Check,
  Sparkles,
  Maximize2,
  AlertCircle,
  SearchX,
  ArrowRight,
  Download,
} from "lucide-react";

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
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchGalleryInfo();
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
    } catch {
      setNotFound(true);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function tryExistingSession() {
    try {
      const res = await fetch(`/api/public/gallery/${slug}/photos?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setVerified(true);
        setPhotos(data.photos ?? []);
        setNextCursor(data.nextCursor);
      }
    } catch {
      // Session expired or unauthenticated
    }
  }

  async function handlePinSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const pinStr = pin.join("");
    if (pinStr.length !== 6) {
      toast.error("Please enter all 6 digits.");
      return;
    }

    setVerifying(true);
    setPinError(false);
    try {
      const res = await fetch(`/api/public/gallery/${slug}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinStr }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        const retryAfter = res.headers.get("Retry-After") || "60";
        toast.error(`Too many attempts. Try again in ${retryAfter} seconds.`);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setVerified(true);
        loadPhotos();
        toast.success("Access granted! Welcome to the gallery.");
      } else {
        setPinError(true);
        toast.error("Incorrect PIN. Please try again.");
        setTimeout(() => {
          setPin(["", "", "", "", "", ""]);
          setPinError(false);
          document.getElementById("pin-0")?.focus();
        }, 600);
      }
    } catch {
      toast.error("Verification failed. Please check connection.");
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

  function handlePinPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newPin = [...pin];
    for (let i = 0; i < 6; i++) {
      newPin[i] = pasted[i] || "";
    }
    setPin(newPin);

    const nextIndex = Math.min(pasted.length, 5);
    document.getElementById(`pin-${nextIndex}`)?.focus();

    if (pasted.length === 6) {
      // Trigger submission shortly
      setTimeout(() => {
        const pinStr = pasted;
        setVerifying(true);
        fetch(`/api/public/gallery/${slug}/verify-pin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pinStr }),
        }).then(async (res) => {
          if (res.ok) {
            setVerified(true);
            loadPhotos();
            toast.success("Access granted! Welcome to the gallery.");
          } else {
            setPinError(true);
            toast.error("Incorrect PIN. Please try again.");
            setTimeout(() => {
              setPin(["", "", "", "", "", ""]);
              setPinError(false);
              document.getElementById("pin-0")?.focus();
            }, 600);
          }
        }).finally(() => setVerifying(false));
      }, 100);
    }
  }

  function copyGalleryLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Gallery link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
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
      <div className="min-h-screen flex items-center justify-center bg-[#090A0F]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">Loading Secure Gallery...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090A0F] px-4">
        <div className="text-center max-w-md p-8 rounded-2xl bg-[#0D0E15] border border-white/10 shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <SearchX className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Gallery Not Found</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              This gallery link is invalid, expired, or has not been published by the lead photographer.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" className="gap-2">
                Go to Sign In <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[400px] bg-cyan-600/5 rounded-full blur-[140px]" />
      </div>

      {/* Gallery Header */}
      <header className="border-b border-white/[0.08] bg-[#090A0F]/80 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">FrameVault</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                Client Gallery
              </span>
            </div>
          </div>

          {galleryInfo && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-sm text-zinc-100">{galleryInfo.event.name}</p>
                <div className="flex items-center justify-end gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    {new Date(galleryInfo.event.eventDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {galleryInfo.event.location && (
                    <span className="flex items-center gap-1 text-zinc-400">
                      • <MapPin className="w-3 h-3 text-zinc-400" />
                      {galleryInfo.event.location}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={copyGalleryLink}
                className="gap-1.5 h-8 text-xs font-mono"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{copiedLink ? "Copied" : "Share"}</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 relative z-10">
        {!verified ? (
          /* ==============================================
             PIN ENTRY SECURITY GATEWAY
             ============================================== */
          <div className="flex flex-col items-center justify-center min-h-[65vh]">
            <div className="w-full max-w-md">
              <div className="rounded-2xl bg-[#0D0E15]/95 border border-white/10 p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                {/* Subtle top rim light */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                <div className="text-center mb-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                      {galleryInfo?.event.name ?? "Private Client Gallery"}
                    </h1>
                    <p className="text-xs text-zinc-400 font-mono mt-1.5">
                      PROTECTED BY 6-DIGIT ACCESS PIN
                    </p>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    Enter the access PIN provided by your photographer to view high-resolution event moments.
                  </p>
                </div>

                <form onSubmit={handlePinSubmit} className="space-y-6">
                  {/* Discrete 6-digit boxes with paste handler */}
                  <div
                    className={cn(
                      "flex justify-center gap-2.5 sm:gap-3",
                      pinError && "animate-shake"
                    )}
                    onPaste={handlePinPaste}
                  >
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
                          "w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-mono font-bold rounded-xl border transition-all duration-200",
                          "bg-[#141622] text-white focus:outline-none",
                          digit
                            ? "border-indigo-500/80 ring-2 ring-indigo-500/20 text-white shadow-lg shadow-indigo-500/10"
                            : "border-white/10 text-zinc-400 hover:border-white/20",
                          pinError && "border-rose-500/80 text-rose-300 ring-2 ring-rose-500/20",
                          "focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/25"
                        )}
                        aria-label={`PIN digit ${i + 1}`}
                        disabled={rateLimited || verifying}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  {rateLimited && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 text-center flex items-center justify-center gap-2 font-mono">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Rate limited. Please wait 60 seconds before trying again.
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold tracking-wide"
                    loading={verifying}
                    disabled={pin.join("").length !== 6 || rateLimited}
                  >
                    {verifying ? "Verifying PIN..." : "Access Private Gallery"}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                  <p className="text-xs text-zinc-400 font-mono">
                    Secured by FrameVault Zero-Knowledge PIN Gateway
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==============================================
             CURATED CLIENT PHOTO GALLERY
             ============================================== */
          <div className="space-y-7">
            {/* Gallery Control & Meta Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="cyan" className="gap-1 font-mono text-xs">
                    <ShieldCheck className="w-3 h-3" /> Verified Access
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs text-zinc-400 border-white/10">
                    {photos.length} {photos.length === 1 ? "Photo" : "Photos"}
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {galleryInfo?.event.name}
                </h1>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  Click any photo for cinematic lightbox inspection and high-res preview
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyGalleryLink}
                  className="gap-1.5 font-mono text-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  Share Gallery Link
                </Button>
              </div>
            </div>

            {/* Photos Grid or Loading Skeletons */}
            {loadingPhotos && photos.length === 0 ? (
              <div className="masonry-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "masonry-item skeleton rounded-xl",
                      i % 3 === 0 ? "h-72" : i % 3 === 1 ? "h-56" : "h-96"
                    )}
                  />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-24 rounded-2xl bg-[#0D0E15] border border-white/10 p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">No published photos yet</h3>
                  <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                    The photography team is actively curating and processing moments for this event. Check back soon!
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="masonry-grid">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="masonry-item group relative overflow-hidden rounded-xl cursor-pointer bg-[#0D0E15] border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:scale-[1.01]"
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    >
                      {photo.thumbnailUrl ? (
                        <Image
                          src={photo.thumbnailUrl}
                          alt={`${galleryInfo?.event.name ?? "Photo"} — Frame ${index + 1}`}
                          width={photo.width ?? 600}
                          height={photo.height ?? 400}
                          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-56 bg-zinc-900/60 flex items-center justify-center text-zinc-600">
                          <Camera className="w-8 h-8 opacity-40" />
                        </div>
                      )}

                      {/* Obsidian hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3.5">
                        <div className="flex justify-end">
                          <div className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                          <span>Frame #{String(index + 1).padStart(3, "0")}</span>
                          {photo.width && photo.height && (
                            <span className="text-[11px] text-zinc-400">
                              {photo.width} × {photo.height}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination / Cursor Load More */}
                {nextCursor && (
                  <div className="text-center py-8">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => loadPhotos(nextCursor)}
                      loading={loadingPhotos}
                      className="gap-2 font-mono text-xs px-6"
                    >
                      Load More Photos
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Lightbox Integration */}
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

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#090A0F] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
          <p>© {new Date().getFullYear()} FrameVault. High-performance photography cloud.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Photographer Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
