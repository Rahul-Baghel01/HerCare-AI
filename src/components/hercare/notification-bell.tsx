import { ErrorState, LoadingCard } from "@/components/hercare/kit";
import { Bell } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRows, useUpdateRow } from "@/lib/data";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  due_at: string;
  read: boolean;
};

export function NotificationBell() {
  const query = useRows<Notification>("notifications", { orderBy: "due_at" });
  const rows = query.data ?? [];
  const markRead = useUpdateRow("notifications", "Marked as read");

  const now = Date.now();
  const due = rows.filter((n) => new Date(n.due_at).getTime() <= now);
  const unread = due.filter((n) => !n.read);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          {unread.length ? (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {unread.length ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={markRead.isPending}
              onClick={() =>
                unread.forEach((n) => markRead.mutate({ id: n.id, values: { read: true } }))
              }
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-80">
          {query.isLoading ? (
            <LoadingCard rows={2} />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : due.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              You're all caught up. Saved appointment reminders will appear here when due.
            </p>
          ) : (
            <ul className="space-y-1 px-2 pb-3">
              {due.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    disabled={markRead.isPending}
                    onClick={() => !n.read && markRead.mutate({ id: n.id, values: { read: true } })}
                    className={`w-full rounded-2xl px-3 py-2 text-left transition-colors hover:bg-accent/60 ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? <p className="text-xs text-muted-foreground">{n.body}</p> : null}
                    <p className="pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {format(parseISO(n.due_at), "d MMM · HH:mm")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
