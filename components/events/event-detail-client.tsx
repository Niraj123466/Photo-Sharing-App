"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const tabs = ["Overview", "Team", "Photos", "Gallery"] as const;

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
      const res = await fetch(`/api/events/${event.id}/gallery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Failed to create gallery.");
      } else {
        setGallery(data.data);
        setCurrentPin(data.data.pin);
        toast.success("Gallery created! Save the PIN below.");
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
        toast.success("Gallery published!");
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
      const res = await fetch(`/api/galleries/${gallery.id}/regenerate-pin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (res.ok) {
        setCurrentPin(data.data.pin);
        toast.success("PIN regenerated! Save it now.");
      } else {
        toast.error(data.error?.message);
      }
    } finally {
      setRegeneratingPin(false);
    }
  }

  const galleryUrl = gallery ? `${appUrl}/gallery/${gallery.publicSlug}` : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/events" className="text-muted-foreground hover:text-foreground text-sm">
              ← Events
            </Link>
          </div>
          <h1 className="text-3xl font-bold mt-1">{event.name}</h1>
          {event.location && (
            <p className="text-muted-foreground mt-1">📍 {event.location}</p>
          )}
        </div>
        <Badge variant={event.status === "ACTIVE" ? "success" : "outline"}>
          {event.status}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Name" value={event.name} />
              <Row label="Date" value={new Date(event.eventDate).toLocaleDateString("en-US", { dateStyle: "long" })} />
              {event.location && <Row label="Location" value={event.location} />}
              {event.description && <Row label="Description" value={event.description} />}
              <Row label="Status" value={event.status} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Statistics</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Team Members" value={members.length} />
              <Row label="Ready Photos" value={readyPhotos} />
              <Row label="Selected for Gallery" value={selectedPhotos} />
              <Row label="Gallery Status" value={gallery?.status ?? "No gallery"} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Team" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Team Member</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              <select
                className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select a user to add...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — {u.role}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddMember} loading={addingMember} disabled={!selectedUserId}>
                Add
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">No team members assigned yet.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                  <div>
                    <p className="font-medium text-sm">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{m.user.role}</Badge>
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      className="p-1.5 rounded hover:bg-destructive/10 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "Photos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{readyPhotos} ready photos · {selectedPhotos} selected</p>
            </div>
            <Link href={`/events/${event.id}/photos`}>
              <Button>Review &amp; Select Photos →</Button>
            </Link>
          </div>
          <div className="p-8 rounded-xl border border-dashed border-border/50 text-center text-muted-foreground text-sm">
            Go to the Photos tab to review uploads, select photos, and manage your gallery selection.
          </div>
        </div>
      )}

      {activeTab === "Gallery" && (
        <div className="space-y-4">
          {!gallery ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">🎨</div>
                <h3 className="font-medium text-lg">No gallery yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  Select photos from the Photos tab first, then create a gallery.
                </p>
                <Button onClick={handleCreateGallery} loading={creatingGallery}>
                  Create Gallery
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {currentPin && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 font-semibold text-sm">⚠️ Save this PIN — it will only be shown once!</p>
                  <p className="text-3xl font-mono font-bold mt-1 tracking-widest">{currentPin}</p>
                </div>
              )}

              <Card>
                <CardHeader><CardTitle>Gallery Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Row label="Status" value={<Badge variant={gallery.status === "PUBLISHED" ? "success" : "outline"}>{gallery.status}</Badge>} />
                  <Row label="Photos Selected" value={gallery._count.photos} />
                  {galleryUrl && <Row label="Public URL" value={<a href={galleryUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all text-xs">{galleryUrl}</a>} />}

                  <div className="flex flex-wrap gap-3 pt-2">
                    {gallery.status !== "PUBLISHED" ? (
                      <Button onClick={handlePublish} loading={publishingGallery}>
                        Publish Gallery
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={handleUnpublish}>
                        Unpublish
                      </Button>
                    )}

                    <Button variant="outline" onClick={handleRegeneratePin} loading={regeneratingPin}>
                      Regenerate PIN
                    </Button>

                    {galleryUrl && (
                      <Button
                        variant="secondary"
                        onClick={() => { navigator.clipboard.writeText(galleryUrl); toast.success("URL copied!"); }}
                      >
                        Copy URL
                      </Button>
                    )}
                  </div>

                  <Link href={`/events/${event.id}/photos`}>
                    <Button variant="outline" className="w-full">
                      Manage Photo Selection →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
