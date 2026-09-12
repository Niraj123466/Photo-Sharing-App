"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  MapPin,
  Clock,
  Camera,
  Users,
  Share2,
  Lock,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ChevronLeft,
} from "lucide-react";

type Member = {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; role: string };
};

type Gallery = {
  id: string;
  name?: string | null;
  status: string;
  publicSlug: string;
  publishedAt?: string | null;
  _count: { photos: number };
};

type EventData = {
  id: string;
  name: string;
  description?: string | null;
  eventDate: string;
  location?: string | null;
  status: string;
};

type Props = {
  event: EventData & { galleries: Gallery[] };
  members: Member[];
  availableUsers: { id: string; name: string; email: string; role: string }[];
  readyPhotos: number;
  selectedPhotos: number;
  appUrl: string;
};

const tabs = ["Overview", "Photos", "Gallery", "Team"] as const;

export function EventDetailClient({
  event,
  members: initialMembers,
  availableUsers: initialAvailableUsers,
  readyPhotos,
  selectedPhotos,
  appUrl,
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [members, setMembers] = useState(initialMembers);
  const [availableUsers, setAvailableUsers] = useState(initialAvailableUsers);
  const [gallery, setGallery] = useState(event.galleries[0] ?? null);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [publishingGallery, setPublishingGallery] = useState(false);
  const [creatingGallery, setCreatingGallery] = useState(false);
  const [regeneratingPin, setRegeneratingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  async function handleAddMember() {
    if (!selectedUserId) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/events/${event.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Failed to add member.");
      } else {
        toast.success("Team member added.");
        setMembers((prev) => [...prev, data.data]);
        setAvailableUsers((prev) => prev.filter((u) => u.id !== selectedUserId));
        setSelectedUserId("");
      }
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      const res = await fetch(`/api/events/${event.id}/members/${userId}`, { method: "DELETE" });
      if (res.ok) {
        const removed = members.find((m) => m.userId === userId);
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        if (removed) setAvailableUsers((prev) => [...prev, removed.user]);
        toast.success("Member removed.");
      }
    } catch {
      toast.error("Failed to remove member.");
    }
  }

  async function handleCreateGallery() {
    setCreatingGallery(true);
    try {
      const res = await fetch(`/api/events/${event.id}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Failed to create gallery.");
      } else {
        setGallery(data.data);
        setCurrentPin(data.data.pin);
        toast.success("Gallery created! Note down the PIN below.");
      }
    } finally {
      setCreatingGallery(false);
    }
  }

  async function handlePublish() {
    if (!gallery) return;
    setPublishingGallery(true);
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Failed to publish.");
      } else {
        setGallery(data.data);
        toast.success("Gallery is now published for clients!");
      }
    } finally {
      setPublishingGallery(false);
    }
  }

  async function handleUnpublish() {
    if (!gallery) return;
    const res = await fetch(`/api/galleries/${gallery.id}/unpublish`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setGallery(data.data);
      toast.success("Gallery unpublished.");
    } else {
      toast.error(data.error?.message);
    }
  }

  async function handleRegeneratePin() {
    if (!gallery) return;
    setRegeneratingPin(true);
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/regenerate-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPin(data.data.pin);
        toast.success("PIN regenerated successfully!");
      } else {
        toast.error(data.error?.message);
      }
    } finally {
      setRegeneratingPin(false);
    }
  }

  const galleryPublicUrl = gallery ? `${appUrl}/gallery/${gallery.publicSlug}` : null;

  function copyToClipboard(text: string, type: "link" | "pin") {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("Gallery link copied to clipboard!");
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
      toast.success("PIN copied to clipboard!");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Breadcrumb & Hero Header */}
      <div className="pb-5 border-b border-white/[0.08]">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to Events</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">
                {event.name}
              </h1>
              <Badge
                variant={
                  event.status === "ACTIVE"
                    ? "success"
                    : event.status === "DRAFT"
                    ? "warning"
                    : "secondary"
                }
                dot={event.status === "ACTIVE"}
              >
                {event.status}
              </Badge>
              {gallery?.status === "PUBLISHED" && (
                <Badge variant="cyan" dot>
                  Gallery Live
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                {new Date(event.eventDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/events/${event.id}/photos`}>
              <Button size="sm">
                <Camera className="w-3.5 h-3.5" />
                <span>Curate Photos</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Segmented Control Navigation Tabs */}
      <div className="flex border-b border-white/[0.08] gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all duration-150 ${
              activeTab === tab
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "Overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Production Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Row label="Event Name" value={event.name} />
              <Row
                label="Shoot Date"
                value={new Date(event.eventDate).toLocaleDateString("en-US", {
                  dateStyle: "long",
                })}
              />
              {event.location && <Row label="Location" value={event.location} />}
              {event.description && <Row label="Notes" value={event.description} />}
              <Row label="Production Status" value={event.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Asset & Curation Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Row label="Assigned Photographers" value={`${members.length} members`} />
              <Row label="Cloud Ingested Assets" value={`${readyPhotos} ready photos`} />
              <Row label="Selected for Client Gallery" value={`${selectedPhotos} photos`} />
              <Row label="Client Gallery State" value={gallery?.status ?? "Not created yet"} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === "Photos" && (
        <div className="space-y-4">
          <div className="p-6 rounded-[8px] border border-white/[0.08] bg-[#0D0E15] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Photo Review & Curation Workstation</h3>
              <p className="text-xs text-slate-400 mt-1">
                {readyPhotos} assets processed · {selectedPhotos} currently curated for client viewing.
              </p>
            </div>
            <Link href={`/events/${event.id}/photos`}>
              <Button size="sm">
                <span>Launch Curation Workstation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Gallery Tab */}
      {activeTab === "Gallery" && (
        <div className="space-y-4">
          {!gallery ? (
            <Card>
              <CardContent className="p-10 text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-slate-100">No Client Gallery Created Yet</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
                  Create a secure, PIN-protected public gallery link for your clients to view and download their curated photos.
                </p>
                <Button onClick={handleCreateGallery} loading={creatingGallery} size="sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Client Gallery</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Client Access & Security</CardTitle>
                    <Badge variant={gallery.status === "PUBLISHED" ? "success" : "warning"} dot>
                      {gallery.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 uppercase">Shareable Gallery URL</label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 p-2 rounded-[6px] border border-white/[0.08] bg-[#090A0F] font-mono text-xs text-slate-200 truncate">
                        {galleryPublicUrl}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5"
                        onClick={() => galleryPublicUrl && copyToClipboard(galleryPublicUrl, "link")}
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      {gallery.status === "PUBLISHED" && galleryPublicUrl && (
                        <Link href={galleryPublicUrl} target="_blank">
                          <Button variant="secondary" size="sm" className="h-8 px-2.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-slate-400 uppercase">Gallery Access PIN</label>
                      <button
                        onClick={handleRegeneratePin}
                        disabled={regeneratingPin}
                        className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${regeneratingPin ? "animate-spin" : ""}`} />
                        <span>Regenerate PIN</span>
                      </button>
                    </div>

                    {currentPin ? (
                      <div className="mt-1 p-3 rounded-[6px] border border-indigo-500/30 bg-indigo-500/[0.06] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-lg font-bold tracking-widest text-indigo-300">
                            {currentPin}
                          </span>
                          <p className="text-[10px] text-amber-400/80 mt-0.5">
                            Active PIN for clients. Save or copy it now.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          onClick={() => copyToClipboard(currentPin, "pin")}
                        >
                          {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-1 p-2.5 rounded-[6px] border border-white/[0.06] bg-[#090A0F] text-slate-400 font-mono text-xs flex items-center justify-between">
                        <span>•••••• (Stored as bcrypt hash)</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-2 text-indigo-400"
                          onClick={handleRegeneratePin}
                        >
                          Show New PIN
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Publication Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-slate-400 leading-relaxed">
                    When published, anyone with the shareable link and the 6-digit PIN can view curated photos in high resolution and download them.
                  </p>

                  <div className="pt-2 flex flex-col gap-2.5">
                    {gallery.status === "PUBLISHED" ? (
                      <Button variant="outline" onClick={handleUnpublish} className="w-full">
                        Unpublish Gallery (Revoke Public Access)
                      </Button>
                    ) : (
                      <Button onClick={handlePublish} loading={publishingGallery} className="w-full">
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Publish Gallery to Clients</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "Team" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign Photographer Crew</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2.5">
              <select
                className="flex-1 h-9 rounded-[6px] border border-white/[0.1] bg-[#0D0E15] px-3 text-xs text-slate-200 focus-visible:outline-none focus-visible:border-indigo-500"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select a registered team member...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — {u.role}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddMember} loading={addingMember} disabled={!selectedUserId} size="sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Assign to Event</span>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {members.length === 0 ? (
              <div className="text-center py-10 rounded-[8px] border border-dashed border-white/[0.08] text-slate-400 text-xs">
                No photographers assigned yet. Assign a team member above.
              </div>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-[7px] border border-white/[0.08] bg-[#0D0E15]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-mono text-xs font-semibold text-indigo-300">
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-xs text-slate-200">{m.user.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{m.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{m.user.role}</Badge>
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      className="p-1.5 rounded-[5px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove from event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-200 font-mono text-[11px]">{value}</span>
    </div>
  );
}
