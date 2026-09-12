"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  Plus,
  Search,
  Users,
  Camera,
  MapPin,
  Clock,
  ArrowUpRight,
  ExternalLink,
  X,
  SlidersHorizontal,
} from "lucide-react";

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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-[4px]">
              EVENTS PORTFOLIO
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">
            Event Management
          </h1>
          <p className="text-xs lg:text-sm text-slate-400 mt-0.5">
            Coordinate team shoots, assign photographers, and curate client galleries.
          </p>
        </div>

        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-3.5 h-3.5" />
          <span>New Event</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search events or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-[#0D0E15]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "ACTIVE", "DRAFT", "COMPLETED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-[5px] text-[11px] font-mono font-medium transition-all duration-150 ${
                statusFilter === status
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "bg-[#0D0E15] text-slate-400 border border-white/[0.06] hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cards Grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-[8px] skeleton border border-white/[0.06]" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 rounded-[8px] border border-dashed border-white/[0.08] bg-[#0D0E15]/40">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-slate-400">
            <CalendarDays className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-200">No events matched</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            {events.length === 0
              ? "Create your first photography production to get started."
              : "Try adjusting your search query or status filter."}
          </p>
          {events.length === 0 && (
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
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
  const isPublished = gallery?.status === "PUBLISHED";

  return (
    <Card className="flex flex-col justify-between border-white/[0.08] bg-[#0D0E15] hover:border-white/[0.18] hover:bg-[#141622]/50 transition-all duration-200 group">
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
              {event.name}
            </h3>
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
          </div>

          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span>
                {new Date(event.eventDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1" title="Photographers">
              <Users className="w-3 h-3 text-slate-400" />
              {event._count.members}
            </span>
            <span className="flex items-center gap-1" title="Photos Uploaded">
              <Camera className="w-3 h-3 text-slate-400" />
              {event._count.photos}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link href={`/events/${event.id}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                Manage
              </Button>
            </Link>
            <Link href={`/events/${event.id}/photos`}>
              <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5">
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
    status: "ACTIVE" as const,
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
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0D0E15] border border-white/[0.12] rounded-[10px] shadow-[0_24px_48px_rgba(0,0,0,0.8)] p-6 animate-fade-in text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-100">Create New Event</h2>
            <p className="text-xs text-slate-400">Initialize a collaborative photography production.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300">Event Title *</label>
            <Input
              className="mt-1"
              placeholder="e.g. Arjun & Priya Wedding"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Event Date *</label>
              <Input
                type="date"
                className="mt-1 [color-scheme:dark]"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Initial Status</label>
              <select
                className="mt-1 flex h-9 w-full rounded-[6px] border border-white/[0.1] bg-[#0D0E15] px-3 text-xs text-slate-200 focus-visible:outline-none focus-visible:border-indigo-500"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "ACTIVE" }))}
              >
                <option value="ACTIVE">Active (Live Uploads)</option>
                <option value="DRAFT">Draft</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">Shoot Location</label>
            <Input
              className="mt-1"
              placeholder="e.g. The Grand Ballroom, Mumbai"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">Description / Notes</label>
            <textarea
              className="mt-1 flex w-full rounded-[6px] border border-white/[0.1] bg-[#0D0E15] px-3 py-2 text-xs text-slate-200 focus-visible:outline-none focus-visible:border-indigo-500 resize-none placeholder:text-slate-500"
              rows={2}
              placeholder="Brief details about shoot schedule, equipment requirements..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-white/[0.08]">
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
