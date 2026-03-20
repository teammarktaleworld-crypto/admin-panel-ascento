"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, CalendarCheck2, Megaphone, RefreshCcw, Send } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { classesApi, eventsApi, notificationsApi, remindersApi, studentsApi, teachersApi } from "@/lib/api";

type Option = {
  id: string;
  label: string;
};

function toRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  if (data && typeof data === "object") {
    const obj = data as { data?: unknown; items?: unknown };
    if (Array.isArray(obj.data)) {
      return obj.data as Array<Record<string, unknown>>;
    }
    if (Array.isArray(obj.items)) {
      return obj.items as Array<Record<string, unknown>>;
    }
  }
  return [];
}

function mapOptions(rows: Array<Record<string, unknown>>, keys: string[]): Option[] {
  return rows
    .map((row) => {
      const id = String(row._id ?? row.id ?? "");
      const label = keys.map((key) => String(row[key] ?? "").trim()).find((value) => value.length > 0) ?? id;
      return { id, label };
    })
    .filter((opt) => opt.id.length > 0);
}

export default function NotificationsPage() {
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data as { message?: string } | undefined;
      return payload?.message || error.message || fallback;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  };

  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    targetType: "broadcast",
    status: "active",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    location: "",
    attachmentsText: "",
  });
  const [reminderForm, setReminderForm] = useState({
    title: "",
    description: "",
    targetType: "class",
    targetId: "",
    reminderDate: "",
  });

  const classesQuery = useQuery({ queryKey: ["classes", "notifications"], queryFn: () => classesApi.list() });
  const studentsQuery = useQuery({ queryKey: ["students", "notifications"], queryFn: () => studentsApi.list() });
  const teachersQuery = useQuery({ queryKey: ["teachers", "notifications"], queryFn: () => teachersApi.list() });

  const classOptions = useMemo(() => mapOptions(toRows(classesQuery.data), ["name"]), [classesQuery.data]);
  const studentOptions = useMemo(() => mapOptions(toRows(studentsQuery.data), ["fullName", "parentEmail"]), [studentsQuery.data]);
  const teacherOptions = useMemo(() => mapOptions(toRows(teachersQuery.data), ["name", "email"]), [teachersQuery.data]);

  const targetOptions = useMemo(() => {
    if (reminderForm.targetType === "class") {
      return classOptions;
    }
    if (reminderForm.targetType === "student") {
      return studentOptions;
    }
    if (reminderForm.targetType === "teacher") {
      return teacherOptions;
    }
    return [];
  }, [classOptions, reminderForm.targetType, studentOptions, teacherOptions]);

  const notificationMutation = useMutation({
    mutationFn: async () => notificationsApi.create(notificationForm),
    onSuccess: () => {
      toast.success("Notification created");
      setNotificationForm({ title: "", message: "", targetType: "broadcast", status: "active" });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Notification create failed")),
  });

  const eventMutation = useMutation({
    mutationFn: async () =>
      eventsApi.create({
        title: eventForm.title,
        description: eventForm.description,
        eventDate: eventForm.eventDate,
        location: eventForm.location,
        attachments: eventForm.attachmentsText
          .split("\n")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      }),
    onSuccess: () => {
      toast.success("Event created");
      setEventForm({ title: "", description: "", eventDate: "", location: "", attachmentsText: "" });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Event create failed")),
  });

  const reminderMutation = useMutation({
    mutationFn: async () =>
      remindersApi.create({
        ...reminderForm,
        targetId: reminderForm.targetType === "broadcast" ? "" : reminderForm.targetId,
      }),
    onSuccess: () => {
      toast.success("Reminder created");
      setReminderForm({
        title: "",
        description: "",
        targetType: "class",
        targetId: "",
        reminderDate: "",
      });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Reminder create failed")),
  });

  const isPageLoading = classesQuery.isLoading || studentsQuery.isLoading || teachersQuery.isLoading;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-20" />
          </Card>
          <Card>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-20" />
          </Card>
          <Card>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-20" />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-22 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg">
        <div className="space-y-1 p-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">Communication</p>
          <h1 className="text-2xl font-semibold">Notifications Center</h1>
          <p className="text-sm text-white/85">Send notifications, events, and reminders with a cleaner, safer workflow.</p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-zinc-500">Classes</p>
          <p className="mt-1 text-2xl font-semibold">{classOptions.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Students</p>
          <p className="mt-1 text-2xl font-semibold">{studentOptions.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Teachers</p>
          <p className="mt-1 text-2xl font-semibold">{teacherOptions.length}</p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            void classesQuery.refetch();
            void studentsQuery.refetch();
            void teachersQuery.refetch();
          }}
        >
          <RefreshCcw size={14} className="mr-2" />
          Refresh Targets
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-orange-600" />
            <h2 className="text-lg font-semibold">Create Notification</h2>
          </div>
          <Input
            value={notificationForm.title}
            onChange={(event) => setNotificationForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Title"
          />
          <Textarea
            rows={4}
            value={notificationForm.message}
            onChange={(event) => setNotificationForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Message"
          />
          <Select
            value={notificationForm.targetType}
            onChange={(event) => setNotificationForm((prev) => ({ ...prev, targetType: event.target.value }))}
          >
            <option value="broadcast">Broadcast</option>
            <option value="class">Class</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </Select>
          <Select
            value={notificationForm.status}
            onChange={(event) => setNotificationForm((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Button
            onClick={() => {
              if (!notificationForm.title || !notificationForm.message) {
                toast.error("Title and message are required");
                return;
              }
              notificationMutation.mutate();
            }}
            disabled={notificationMutation.isPending}
          >
            <Send size={14} className="mr-2" />
            {notificationMutation.isPending ? "Submitting..." : "Submit Notification"}
          </Button>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarCheck2 size={18} className="text-rose-600" />
            <h2 className="text-lg font-semibold">Create Event</h2>
          </div>
          <Input value={eventForm.title} onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Event Title" />
          <Textarea rows={3} value={eventForm.description} onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" />
          <Input type="date" value={eventForm.eventDate} onChange={(event) => setEventForm((prev) => ({ ...prev, eventDate: event.target.value }))} />
          <Input value={eventForm.location} onChange={(event) => setEventForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Location" />
          <Textarea
            rows={3}
            value={eventForm.attachmentsText}
            onChange={(event) => setEventForm((prev) => ({ ...prev, attachmentsText: event.target.value }))}
            placeholder="Attachment URLs, one per line"
          />
          <Button
            onClick={() => {
              if (!eventForm.title || !eventForm.description || !eventForm.eventDate || !eventForm.location) {
                toast.error("Please complete all required event fields");
                return;
              }
              eventMutation.mutate();
            }}
            disabled={eventMutation.isPending}
          >
            <Send size={14} className="mr-2" />
            {eventMutation.isPending ? "Submitting..." : "Submit Event"}
          </Button>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <BellRing size={18} className="text-amber-600" />
            <h2 className="text-lg font-semibold">Create Reminder</h2>
          </div>
          <Input value={reminderForm.title} onChange={(event) => setReminderForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Reminder Title" />
          <Textarea rows={3} value={reminderForm.description} onChange={(event) => setReminderForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" />
          <Select
            value={reminderForm.targetType}
            onChange={(event) =>
              setReminderForm((prev) => ({
                ...prev,
                targetType: event.target.value,
                targetId: "",
              }))
            }
          >
            <option value="class">Class</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="broadcast">Broadcast</option>
          </Select>
          <Select
            value={reminderForm.targetId}
            onChange={(event) => setReminderForm((prev) => ({ ...prev, targetId: event.target.value }))}
            disabled={reminderForm.targetType === "broadcast"}
          >
            <option value="">{reminderForm.targetType === "broadcast" ? "No target needed" : "Select target"}</option>
            {targetOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={reminderForm.reminderDate}
            onChange={(event) => setReminderForm((prev) => ({ ...prev, reminderDate: event.target.value }))}
          />
          <Button
            onClick={() => {
              if (!reminderForm.title || !reminderForm.description || !reminderForm.reminderDate) {
                toast.error("Please complete all required reminder fields");
                return;
              }
              if (reminderForm.targetType !== "broadcast" && !reminderForm.targetId) {
                toast.error("Please choose a target");
                return;
              }
              reminderMutation.mutate();
            }}
            disabled={reminderMutation.isPending}
          >
            <Send size={14} className="mr-2" />
            {reminderMutation.isPending ? "Submitting..." : "Submit Reminder"}
          </Button>
        </Card>
      </div>

      <p className="text-xs text-zinc-500">API coverage: POST /admin/notifications, POST /admin/events, POST /admin/reminders</p>
    </div>
  );
}
