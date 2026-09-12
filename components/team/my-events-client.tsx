"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Camera, Clock, UploadCloud, ArrowUpRight } from "lucide-react";

type Event = {
  id: string;
  name: string;
  eventDate: string;
  location?: string | null;
  status: string;
  creator: { name: string; email: string };
  _count: { photos: number };
  myPhotoCount: number;
};

export function MyEventsClient({ events }: { events: Event[] }) {
  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      <div className="pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-[4px]">
            CREW PORTAL
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">My Assigned Events</h1>
        <p className="text-xs lg:text-sm text-slate-400 mt-0.5">
          Select an event below to upload camera batches and view your uploaded shots.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 rounded-[8px] border border-dashed border-white/[0.08] bg-[#0D0E15]/50">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-slate-400">
            <CalendarDays className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-200">No events assigned yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Your studio admin will assign you to an event shoot soon. Check back shortly.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card
              key={event.id}
              className="flex flex-col justify-between border-white/[0.08] bg-[#0D0E15] hover:border-white/[0.18] hover:bg-[#141622]/50 transition-all duration-200 group"
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {event.name}
                    </h3>
                    <Badge variant={event.status === "ACTIVE" ? "success" : "secondary"} dot={event.status === "ACTIVE"}>
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

                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    Admin: <span className="text-slate-300">{event.creator.name}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-200 font-bold">{event.myPhotoCount}</span>
                    <span className="text-slate-400">/ {event._count.photos} total</span>
                  </div>

                  <Link href={`/my-events/${event.id}/upload`}>
                    <Button size="sm" className="h-7 text-xs px-2.5">
                      <UploadCloud className="w-3 h-3" />
                      <span>Upload</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
