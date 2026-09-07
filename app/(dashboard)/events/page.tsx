"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Event = {
  id: string;
  name: string;
  description?: string;
  eventDate: string;
  location?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  _count: { members: number; photos: number };
  galleries: { id: string; status: string; publicSlug: string }[];
};

const statusVariants: Record<string, "default" | "success" | "secondary" | "outline"> = {
  DRAFT: "outline",
  ACTIVE: "success",
  COMPLETED: "secondary",
  ARCHIVED: "secondary",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch {
      toast.error("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">Manage your photography events</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Event
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl skeleton" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border/50">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-medium">No events yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">Create your first photography event to get started</p>
          <Button onClick={() => setShowCreate(true)}>Create Event</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={(event) => {
            setEvents((prev) => [event, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const gallery = event.galleries[0];

  return (
    <Card className="hover:border-primary/30 transition-all duration-200 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                {event.name}
              </h3>
              <Badge variant={statusVariants[event.status] ?? "secondary"}>
                {event.status}
              </Badge>
              {gallery?.status === "PUBLISHED" && (
                <Badge variant="success">Gallery Published</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span>
                📅{" "}
                {new Date(event.eventDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {event.location && <span>📍 {event.location}</span>}
              <span>👥 {event._count.members} members</span>
              <span>📷 {event._count.photos} photos</span>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{event.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/events/${event.id}`}>
              <Button variant="outline" size="sm">
                Open
              </Button>
            </Link>
            <Link href={`/events/${event.id}/photos`}>
              <Button variant="ghost" size="sm">
                Photos
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (event: Event) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    eventDate: "",
    location: "",
    status: "DRAFT" as const,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          eventDate: new Date(form.eventDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Failed to create event.");
      } else {
        toast.success("Event created successfully!");
        onCreated(data.data);
      }
    } catch {
      toast.error("Failed to create event.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 animate-fade-in">
        <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Event Name *</label>
            <input
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Arjun & Priya Wedding"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Event Date *</label>
            <input
              type="date"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.eventDate}
              onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Location</label>
            <input
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="The Grand Ballroom, Mumbai"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={2}
              placeholder="A brief description of the event..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "DRAFT" }))}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
