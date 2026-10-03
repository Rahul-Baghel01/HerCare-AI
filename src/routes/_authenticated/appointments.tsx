import { SaveStatus } from "@/components/hercare/care-primitives";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Stethoscope, Trash2 } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GlassCard,
  PageHeader,
  EmptyState,
  LoadingCard,
  ErrorState,
  SectionTitle,
  Disclaimer,
} from "@/components/hercare/kit";
import { useDeleteRow, useInsertRow, useRows, useUpdateRow } from "@/lib/data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — HerCare AI" },
      {
        name: "description",
        content: "Plan gynaecology and wellness appointments with doctor details and reminders.",
      },
      { property: "og:title", content: "Appointments — HerCare AI" },
      { property: "og:description", content: "Your upcoming health appointments in one calendar." },
    ],
  }),
  component: AppointmentsPage,
});

type Appointment = {
  id: string;
  title: string;
  doctor: string | null;
  location: string | null;
  scheduled_at: string;
  notes: string | null;
};

type FormState = {
  title: string;
  doctor: string;
  location: string;
  date: string;
  time: string;
  notes: string;
  reminder: boolean;
};

const emptyForm = (): FormState => ({
  title: "",
  doctor: "",
  location: "",
  date: format(new Date(), "yyyy-MM-dd"),
  time: "09:00",
  notes: "",
  reminder: true,
});

function AppointmentsPage() {
  const query = useRows<Appointment>("appointments", { orderBy: "scheduled_at", ascending: true });
  const insert = useInsertRow("appointments", "Appointment created");
  const update = useUpdateRow("appointments", "Appointment updated");
  const remove = useDeleteRow("appointments");
  const insertNotification = useInsertRow("notifications", "Reminder set");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const appointments = useMemo(() => query.data ?? [], [query.data]);
  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.scheduled_at) >= now);
  const past = appointments.filter((a) => new Date(a.scheduled_at) < now).reverse();

  const bookedDays = useMemo(
    () => appointments.map((a) => parseISO(a.scheduled_at)),
    [appointments],
  );
  const dayAppointments = selectedDay
    ? appointments.filter((a) => isSameDay(parseISO(a.scheduled_at), selectedDay))
    : [];

  function openCreate() {
    insert.reset();
    update.reset();
    setEditing(null);
    setForm({
      ...emptyForm(),
      date: format(selectedDay ?? new Date(), "yyyy-MM-dd"),
    });
    setOpen(true);
  }

  function openEdit(appointment: Appointment) {
    insert.reset();
    update.reset();
    const when = parseISO(appointment.scheduled_at);
    setEditing(appointment);
    setForm({
      title: appointment.title,
      doctor: appointment.doctor ?? "",
      location: appointment.location ?? "",
      date: format(when, "yyyy-MM-dd"),
      time: format(when, "HH:mm"),
      notes: appointment.notes ?? "",
      reminder: false,
    });
    setOpen(true);
  }

  async function save() {
    const title = form.title.trim();
    if (title.length < 2) {
      toast.error("Give the appointment a title.");
      return;
    }
    const scheduled = new Date(`${form.date}T${form.time || "09:00"}`);
    if (Number.isNaN(scheduled.getTime())) {
      toast.error("Pick a valid date and time.");
      return;
    }
    const values = {
      title: title.slice(0, 160),
      doctor: form.doctor.trim() ? form.doctor.trim().slice(0, 160) : null,
      location: form.location.trim() ? form.location.trim().slice(0, 200) : null,
      scheduled_at: scheduled.toISOString(),
      notes: form.notes.trim() ? form.notes.trim().slice(0, 1000) : null,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, values });
      } else {
        await insert.mutateAsync(values);
      }
    } catch {
      return; // Keep the dialog and every field available for retry.
    }
    setOpen(false);
    setEditing(null);
    if (!editing && form.reminder) {
      const due = new Date(scheduled.getTime() - 24 * 60 * 60 * 1000);
      try {
        await insertNotification.mutateAsync({
          kind: "appointment",
          title: `Appointment: ${values.title}`,
          body: `Scheduled ${format(scheduled, "d MMM yyyy, HH:mm")}${values.doctor ? ` with ${values.doctor}` : ""}`,
          due_at: due.toISOString(),
          read: false,
        });
      } catch {
        toast.error("Appointment saved, but the notification could not be created.");
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Track doctor visits, scans and check-ups with reminders."
        action={
          <Dialog
            open={open}
            onOpenChange={(next) => {
              if (!insert.isPending && !update.isPending) setOpen(next);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit appointment" : "New appointment"}</DialogTitle>
                <DialogDescription>
                  Keep visit details and questions together. Fields stay here if saving fails.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="appointments-field-1">Title</Label>
                  <Input
                    id="appointments-field-1"
                    value={form.title}
                    maxLength={160}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Gynaecology check-up"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="appointments-field-2">Doctor / clinician</Label>
                    <Input
                      id="appointments-field-2"
                      value={form.doctor}
                      maxLength={160}
                      onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))}
                      placeholder="Dr Amara Okafor"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="appointments-field-3">Location</Label>
                    <Input
                      id="appointments-field-3"
                      value={form.location}
                      maxLength={200}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="City Women's Clinic"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="appointments-field-4">Date</Label>
                    <Input
                      id="appointments-field-4"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="appointments-field-5">Time</Label>
                    <Input
                      id="appointments-field-5"
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="appointments-field-6">Notes</Label>
                  <Textarea
                    id="appointments-field-6"
                    value={form.notes}
                    maxLength={1000}
                    rows={3}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Questions to ask, tests to request…"
                  />
                </div>
                {editing ? null : (
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">Remind me a day before</p>
                      <p className="text-xs text-muted-foreground">
                        Adds a reminder to your notifications.
                      </p>
                    </div>
                    <Switch
                      aria-label="Remind me a day before"
                      checked={form.reminder}
                      onCheckedChange={(reminder) => setForm((f) => ({ ...f, reminder }))}
                    />
                  </div>
                )}
              </div>
              <SaveStatus
                pending={insert.isPending || update.isPending}
                error={insert.isError || update.isError}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={insert.isPending || update.isPending}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={save} disabled={insert.isPending || update.isPending}>
                  {editing ? "Save changes" : "Create appointment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <GlassCard className="space-y-3">
          <SectionTitle>Calendar</SectionTitle>
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            modifiers={{ booked: bookedDays }}
            modifiersClassNames={{ booked: "bg-primary/15 text-primary font-semibold rounded-md" }}
          />
        </GlassCard>

        <GlassCard delay={0.06} className="space-y-3">
          <SectionTitle hint={selectedDay ? format(selectedDay, "EEEE d MMMM yyyy") : undefined}>
            Selected day
          </SectionTitle>
          {query.isLoading ? (
            <LoadingCard rows={2} />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : dayAppointments.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-5" />}
              title="Nothing booked on this day"
              description="Pick another date or create a new appointment."
              action={
                <Button variant="outline" size="sm" onClick={openCreate}>
                  <Plus className="size-4" /> Add for this day
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {dayAppointments.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appointment={a}
                  onEdit={openEdit}
                  onDelete={(id) => remove.mutate(id)}
                />
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard delay={0.1} className="space-y-3">
        <SectionTitle hint={`${upcoming.length} scheduled`}>Upcoming</SectionTitle>
        {query.isLoading ? (
          <LoadingCard />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="size-5" />}
            title="No upcoming appointments"
            description="Create one to keep your check-ups on track."
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <AppointmentRow
                key={a.id}
                appointment={a}
                onEdit={openEdit}
                onDelete={(id) => remove.mutate(id)}
              />
            ))}
          </ul>
        )}
        <Disclaimer />
      </GlassCard>

      <GlassCard delay={0.14} className="space-y-3">
        <SectionTitle>Past appointments</SectionTitle>
        {query.isLoading ? (
          <LoadingCard rows={2} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : past.length === 0 ? (
          <EmptyState title="No past appointments yet" />
        ) : (
          <ul className="space-y-2">
            {past.slice(0, 20).map((a) => (
              <AppointmentRow
                key={a.id}
                appointment={a}
                onEdit={openEdit}
                onDelete={(id) => remove.mutate(id)}
              />
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}

function AppointmentRow({
  appointment,
  onEdit,
  onDelete,
}: {
  appointment: Appointment;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
}) {
  const when = parseISO(appointment.scheduled_at);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{appointment.title}</p>
        <p className="text-xs text-muted-foreground">
          {format(when, "EEE d MMM yyyy · HH:mm")}
          {appointment.doctor ? ` · ${appointment.doctor}` : ""}
          {appointment.location ? ` · ${appointment.location}` : ""}
        </p>
        {appointment.notes ? (
          <p className="mt-1 text-xs text-muted-foreground">{appointment.notes}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Edit appointment"
          onClick={() => onEdit(appointment)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete appointment"
          onClick={() => onDelete(appointment.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}
