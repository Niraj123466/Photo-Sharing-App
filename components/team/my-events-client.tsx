"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="text-muted-foreground mt-1">Events you have been assigned to</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border/50">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-medium">No events assigned</h3>
          <p className="text-muted-foreground mt-2">
            Your admin will assign you to an event soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id} className="hover:border-primary/30 transition-all duration-200 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {event.name}
                      </h3>
                      <Badge variant={event.status === "ACTIVE" ? "success" : "secondary"}>
                        {event.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span>
                        📅{" "}
                        {new Date(event.eventDate).toLocaleDateString("en-US", { dateStyle: "long" })}
                      </span>
                      {event.location && <span>📍 {event.location}</span>}
                      <span>📷 {event.myPhotoCount} my photos</span>
                      <span>Total: {event._count.photos} photos</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Managed by {event.creator.name}
                    </p>
                  </div>
                  <Link href={`/my-events/${event.id}/upload`}>
                    <Button size="sm">
                      📤 Upload Photos
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
