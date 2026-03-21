"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Download, Pencil, Plus, RefreshCcw, Share2, Sparkles, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import { classesApi, sectionsApi, subjectsApi, teachersApi, timetableApi, yearsApi } from "@/lib/api";
import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimetableEntry, TimetablePayload } from "@/types/api";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

type Option = {
  id: string;
  label: string;
};

function readPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function extractId(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidate = obj._id ?? obj.id;
    if (typeof candidate === "string") {
      return candidate.trim();
    }
  }
  return "";
}

function extractDisplayText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [obj.name, obj.code, obj.email, obj._id, obj.id];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
      if (typeof candidate === "number") {
        return String(candidate);
      }
    }
  }
  return "";
}

function resolveLabel(value: unknown, labelById: Record<string, string>) {
  const id = extractId(value);
  if (id && labelById[id]) {
    return labelById[id];
  }

  const display = extractDisplayText(value);
  if (display) {
    return display;
  }

  return id || "-";
}

function pickId(source: unknown, paths: string[]): string {
  for (const path of paths) {
    const id = extractId(readPath(source, path));
    if (id) {
      return id;
    }
  }
  return "";
}

function toRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  if (data && typeof data === "object") {
    const obj = data as { data?: unknown; items?: unknown; timetable?: unknown; entries?: unknown; slots?: unknown };
    if (Array.isArray(obj.data)) {
      return obj.data as Array<Record<string, unknown>>;
    }
    if (Array.isArray(obj.items)) {
      return obj.items as Array<Record<string, unknown>>;
    }
    if (Array.isArray(obj.timetable)) {
      return obj.timetable as Array<Record<string, unknown>>;
    }
    if (Array.isArray(obj.entries)) {
      return obj.entries as Array<Record<string, unknown>>;
    }
    if (Array.isArray(obj.slots)) {
      return obj.slots as Array<Record<string, unknown>>;
    }

    if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as { data?: unknown; items?: unknown; timetable?: unknown; entries?: unknown; slots?: unknown };
      if (Array.isArray(nested.data)) {
        return nested.data as Array<Record<string, unknown>>;
      }
      if (Array.isArray(nested.items)) {
        return nested.items as Array<Record<string, unknown>>;
      }
      if (Array.isArray(nested.timetable)) {
        return nested.timetable as Array<Record<string, unknown>>;
      }
      if (Array.isArray(nested.entries)) {
        return nested.entries as Array<Record<string, unknown>>;
      }
      if (Array.isArray(nested.slots)) {
        return nested.slots as Array<Record<string, unknown>>;
      }
    }
  }
  return [];
}

function normalizeDay(day: unknown): string {
  return String(day || "")
    .trim()
    .toLowerCase();
}

function mapOptions(rows: Array<Record<string, unknown>>, labelKeys: string[]): Option[] {
  return rows
    .map((row) => {
      const id = String(row._id ?? row.id ?? "");
      const label =
        labelKeys.map((key) => String(row[key] ?? "").trim()).find((value) => value.length > 0) ?? id;
      return { id, label };
    })
    .filter((entry) => entry.id.length > 0);
}

function prettyDay(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function buildLabelMap(options: Option[]) {
  return options.reduce<Record<string, string>>((acc, option) => {
    acc[option.id] = option.label;
    return acc;
  }, {});
}

export default function TimetablePage() {
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

  const queryClient = useQueryClient();

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const [form, setForm] = useState<TimetablePayload>({
    classId: "",
    sectionId: "",
    subjectId: "",
    teacherId: "",
    academicYearId: "",
    dayOfWeek: "monday",
    periodNumber: 1,
    startTime: "09:00",
    endTime: "09:45",
    status: "active",
  });

  const activeFormClassId = form.classId || classId;

  const classesQuery = useQuery({ queryKey: ["classes", "timetable"], queryFn: () => classesApi.list() });
  const sectionsQuery = useQuery({
    queryKey: ["sections", "timetable", classId],
    queryFn: () => sectionsApi.list(classId ? { classId } : undefined),
  });
  const formSectionsQuery = useQuery({
    queryKey: ["sections", "timetable", "form", activeFormClassId],
    queryFn: () => sectionsApi.list(activeFormClassId ? { classId: activeFormClassId } : undefined),
    enabled: !!activeFormClassId,
  });
  const yearsQuery = useQuery({ queryKey: ["years", "timetable"], queryFn: () => yearsApi.list() });
  const subjectsQuery = useQuery({ queryKey: ["subjects", "timetable"], queryFn: () => subjectsApi.list() });
  const teachersQuery = useQuery({ queryKey: ["teachers", "timetable"], queryFn: () => teachersApi.list() });
  const assignmentsQuery = useQuery({ queryKey: ["teacher-assignments", "timetable"], queryFn: () => teachersApi.assignments() });

  const timetableQuery = useQuery({
    queryKey: ["class-timetable", classId, sectionId, academicYearId],
    queryFn: () => {
      const params: Record<string, string> = { status: "active" };
      if (sectionId) {
        params.sectionId = sectionId;
      }
      if (academicYearId) {
        params.academicYearId = academicYearId;
      }
      return timetableApi.classView(classId, params);
    },
    enabled: !!classId,
  });

  const classOptions = useMemo(() => mapOptions(toRows(classesQuery.data), ["name"]), [classesQuery.data]);
  const sectionOptions = useMemo(() => mapOptions(toRows(sectionsQuery.data), ["name"]), [sectionsQuery.data]);
  const formSectionOptions = useMemo(() => mapOptions(toRows(formSectionsQuery.data), ["name"]), [formSectionsQuery.data]);
  const yearOptions = useMemo(() => mapOptions(toRows(yearsQuery.data), ["name"]), [yearsQuery.data]);
  const subjectOptions = useMemo(() => mapOptions(toRows(subjectsQuery.data), ["name", "code"]), [subjectsQuery.data]);
  const teacherOptions = useMemo(() => mapOptions(toRows(teachersQuery.data), ["name", "email"]), [teachersQuery.data]);
  const assignmentRows = useMemo(() => toRows(assignmentsQuery.data), [assignmentsQuery.data]);

  const assignedTeacherIdSet = useMemo(() => {
    const selectedClassId = String(form.classId || "").trim();
    const selectedSectionId = String(form.sectionId || "").trim();
    const selectedSubjectId = String(form.subjectId || "").trim();

    if (!selectedClassId || !selectedSectionId || !selectedSubjectId || assignmentsQuery.isError) {
      return new Set<string>();
    }

    const teacherIds = assignmentRows
      .filter((row) => {
        const classMatch = pickId(row, ["classId", "class"]) === selectedClassId;
        const sectionMatch = pickId(row, ["sectionId", "section"]) === selectedSectionId;
        const subjectMatch = pickId(row, ["subjectId", "subject"]) === selectedSubjectId;
        const statusValue = String(readPath(row, "status") ?? "active").toLowerCase();
        const isActive = statusValue === "active";
        return classMatch && sectionMatch && subjectMatch && isActive;
      })
      .map((row) => pickId(row, ["teacherId", "teacher", "teacherDetails"]))
      .filter((id) => id.length > 0);

    return new Set(teacherIds);
  }, [assignmentRows, assignmentsQuery.isError, form.classId, form.sectionId, form.subjectId]);

  const filteredTeacherOptions = useMemo(() => {
    const shouldFilter = !!form.classId && !!form.sectionId && !!form.subjectId && !assignmentsQuery.isError;
    if (!shouldFilter) {
      return teacherOptions;
    }

    const allowed = teacherOptions.filter((option) => assignedTeacherIdSet.has(option.id));
    if (form.teacherId && !allowed.some((option) => option.id === form.teacherId)) {
      const current = teacherOptions.find((option) => option.id === form.teacherId);
      return current ? [current, ...allowed] : allowed;
    }
    return allowed;
  }, [assignmentsQuery.isError, assignedTeacherIdSet, form.classId, form.sectionId, form.subjectId, form.teacherId, teacherOptions]);

  const subjectLabelById = useMemo(() => buildLabelMap(subjectOptions), [subjectOptions]);
  const teacherLabelById = useMemo(() => buildLabelMap(teacherOptions), [teacherOptions]);
  const classLabelById = useMemo(() => buildLabelMap(classOptions), [classOptions]);
  const sectionLabelById = useMemo(() => buildLabelMap(sectionOptions), [sectionOptions]);
  const yearLabelById = useMemo(() => buildLabelMap(yearOptions), [yearOptions]);

  const entries = useMemo(() => toRows(timetableQuery.data) as TimetableEntry[], [timetableQuery.data]);
  const gridMap = useMemo(
    () =>
      new Map(
        entries
          .filter((entry) => entry?.dayOfWeek && entry?.periodNumber)
          .map((entry) => [`${normalizeDay(entry.dayOfWeek)}-${entry.periodNumber}`, entry]),
      ),
    [entries],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: TimetablePayload) => {
      try {
        return await timetableApi.create(payload);
      } catch (error) {
        const message = getErrorMessage(error, "").toLowerCase();
        const needsAssignment =
          message.includes("teacher must be assigned") ||
          message.includes("assigned to this class") ||
          message.includes("assign teacher");

        if (!needsAssignment) {
          throw error;
        }

        const academicYearValue = yearLabelById[payload.academicYearId] || payload.academicYearId;

        await teachersApi.assignTeacher({
          teacherId: payload.teacherId,
          classId: payload.classId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          academicYear: academicYearValue,
          status: "active",
        });

        toast.success("Teacher assignment created automatically");
        await queryClient.invalidateQueries({ queryKey: ["teacher-assignments", "timetable"] });
        return timetableApi.create(payload);
      }
    },
    onSuccess: async () => {
      toast.success("Timetable period created");
      await queryClient.invalidateQueries({ queryKey: ["class-timetable"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create timetable period")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TimetablePayload> }) => timetableApi.update(id, payload),
    onSuccess: async () => {
      toast.success("Timetable period updated");
      await queryClient.invalidateQueries({ queryKey: ["class-timetable"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update timetable period")),
  });

  const deleteMutation = useMutation({
    mutationFn: timetableApi.remove,
    onSuccess: async () => {
      toast.success("Timetable period deleted");
      await queryClient.invalidateQueries({ queryKey: ["class-timetable"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete timetable period")),
  });

  const isPageLoading =
    classesQuery.isLoading || yearsQuery.isLoading || subjectsQuery.isLoading || teachersQuery.isLoading;
  const isGridRefreshing = timetableQuery.isFetching && !!classId;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreateModal = (day?: string, period?: number) => {
    setEditingId("");
    const defaultSection = sectionId || (sectionOptions.length === 1 ? sectionOptions[0].id : "");
    setForm({
      classId,
      sectionId: defaultSection,
      subjectId: "",
      teacherId: "",
      academicYearId,
      dayOfWeek: day || "monday",
      periodNumber: period || 1,
      startTime: "09:00",
      endTime: "09:45",
      status: "active",
    });
    setOpen(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    const safeClassId = typeof entry.classId === "string" ? entry.classId : String((entry.classId as unknown as { _id?: string })?._id ?? "");
    const safeSectionId = typeof entry.sectionId === "string" ? entry.sectionId : String((entry.sectionId as unknown as { _id?: string })?._id ?? "");
    const safeSubjectId = typeof entry.subjectId === "string" ? entry.subjectId : String((entry.subjectId as unknown as { _id?: string })?._id ?? "");
    const safeTeacherId = typeof entry.teacherId === "string" ? entry.teacherId : String((entry.teacherId as unknown as { _id?: string })?._id ?? "");
    const safeYearId =
      typeof entry.academicYearId === "string"
        ? entry.academicYearId
        : String((entry.academicYearId as unknown as { _id?: string })?._id ?? "");

    setEditingId(entry._id);
    setForm({
      classId: safeClassId,
      sectionId: safeSectionId,
      subjectId: safeSubjectId,
      teacherId: safeTeacherId,
      academicYearId: safeYearId,
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      startTime: entry.startTime,
      endTime: entry.endTime,
      status: entry.status,
    });
    setOpen(true);
  };

  function closeModal() {
    setOpen(false);
    setEditingId("");
  }

  const validateAndBuildPayload = () => {
    const payload: TimetablePayload = {
      classId: String(form.classId || "").trim(),
      sectionId: String(form.sectionId || "").trim(),
      subjectId: String(form.subjectId || "").trim(),
      teacherId: String(form.teacherId || "").trim(),
      academicYearId: String(form.academicYearId || "").trim(),
      dayOfWeek: String(form.dayOfWeek || "monday").toLowerCase(),
      periodNumber: Number(form.periodNumber),
      startTime: String(form.startTime || "").trim(),
      endTime: String(form.endTime || "").trim(),
      status: String(form.status || "active").toLowerCase(),
    };

    if (!payload.classId || !payload.sectionId || !payload.subjectId || !payload.teacherId || !payload.academicYearId) {
      toast.error("Class, section, subject, teacher and academic year are required");
      return null;
    }
    if (!payload.startTime || !payload.endTime) {
      toast.error("Start and end time are required");
      return null;
    }
    if (!days.includes(payload.dayOfWeek)) {
      toast.error("Please select a valid day");
      return null;
    }
    if (!periods.includes(payload.periodNumber)) {
      toast.error("Please select a valid period");
      return null;
    }

    return payload;
  };

  const createTimetablePdf = async () => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const palette = {
      ink: rgb(0.1, 0.1, 0.12),
      muted: rgb(0.42, 0.42, 0.45),
      border: rgb(0.12, 0.12, 0.12),
      softBorder: rgb(0.73, 0.73, 0.73),
      panel: rgb(0.96, 0.9, 0.84),
      panelStrong: rgb(0.9, 0.84, 0.76),
      white: rgb(1, 1, 1),
      sand: rgb(0.9, 0.8, 0.65),
      clay: rgb(0.77, 0.5, 0.39),
      sage: rgb(0.48, 0.65, 0.66),
      blush: rgb(0.86, 0.79, 0.76),
    };

    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    try {
      const response = await fetch("/logo.png");
      if (response.ok) {
        const logoBytes = await response.arrayBuffer();
        logoImage = await pdfDoc.embedPng(logoBytes);
      }
    } catch {
      logoImage = null;
    }

    const selectedClass = classLabelById[classId] || classId || "N/A";
    const selectedSection = sectionLabelById[sectionId] || (sectionId ? sectionId : "All");
    const selectedYear = yearLabelById[academicYearId] || academicYearId || "N/A";
    const totalCells = days.length * periods.length;
    const filledSlots = entries.length;
    const occupancy = `${Math.round((filledSlots / Math.max(1, totalCells)) * 100)}%`;
    const generatedAt = new Date().toLocaleString();

    page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: palette.white });

    page.drawEllipse({ x: 40, y: 552, xScale: 110, yScale: 90, color: palette.sand, opacity: 0.55 });
    page.drawEllipse({ x: 795, y: 520, xScale: 120, yScale: 85, color: palette.clay, opacity: 0.55 });
    page.drawEllipse({ x: 24, y: 30, xScale: 90, yScale: 65, color: palette.sage, opacity: 0.55 });
    page.drawEllipse({ x: 745, y: 28, xScale: 110, yScale: 70, color: palette.blush, opacity: 0.65 });

    page.drawText("WEEKLY SCHEDULE", { x: 52, y: 548, size: 32, font: fontBold, color: palette.ink });
    page.drawText("Academic Timetable Report", { x: 56, y: 528, size: 12, font, color: palette.clay });
    page.drawText(`Generated: ${generatedAt}`, { x: 56, y: 514, size: 8, font, color: palette.muted });

    page.drawRectangle({
      x: 620,
      y: 512,
      width: 192,
      height: 68,
      borderWidth: 1,
      borderColor: palette.softBorder,
      color: rgb(1, 1, 1),
    });

    if (logoImage) {
      const scale = Math.min(172 / logoImage.width, 52 / logoImage.height);
      const width = logoImage.width * scale;
      const height = logoImage.height * scale;
      page.drawImage(logoImage, {
        x: 620 + (192 - width) / 2,
        y: 512 + (68 - height) / 2,
        width,
        height,
      });
    } else {
      page.drawText("ASCENTO", { x: 680, y: 545, size: 14, font: fontBold, color: palette.ink });
      page.drawText("ADMIN", { x: 696, y: 530, size: 10, font, color: palette.muted });
    }

    const metaY = 490;
    page.drawRectangle({
      x: 32,
      y: metaY,
      width: 778,
      height: 24,
      borderWidth: 1,
      borderColor: palette.softBorder,
      color: rgb(1, 1, 1),
    });
    page.drawText(`Class: ${selectedClass}`, { x: 46, y: metaY + 7, size: 10, font: fontBold, color: palette.ink });
    page.drawText(`Section: ${selectedSection}`, { x: 290, y: metaY + 7, size: 10, font: fontBold, color: palette.ink });
    page.drawText(`Academic Year: ${selectedYear}`, { x: 530, y: metaY + 7, size: 10, font: fontBold, color: palette.ink });

    const summaryY = 454;
    [
      { title: "Total Slots", value: String(totalCells), x: 40 },
      { title: "Filled Slots", value: String(filledSlots), x: 200 },
      { title: "Occupancy", value: occupancy, x: 360 },
    ].forEach((item) => {
      page.drawRectangle({
        x: item.x,
        y: summaryY,
        width: 144,
        height: 30,
        borderWidth: 1,
        borderColor: palette.softBorder,
        color: palette.panel,
      });
      page.drawText(item.title, { x: item.x + 8, y: summaryY + 18, size: 7, font, color: palette.muted });
      page.drawText(item.value, { x: item.x + 8, y: summaryY + 6, size: 11, font: fontBold, color: palette.ink });
    });

    page.drawText("Cell format: Subject | Teacher | Time", {
      x: 572,
      y: summaryY + 10,
      size: 8,
      font,
      color: palette.muted,
    });

    const startX = 30;
    const startY = 430;
    const dayColWidth = 92;
    const periodColWidth = 86.75;
    const headerHeight = 30;
    const rowHeight = 58;

    page.drawRectangle({
      x: startX,
      y: startY - headerHeight,
      width: dayColWidth,
      height: headerHeight,
      borderWidth: 1,
      borderColor: palette.softBorder,
      color: palette.panelStrong,
    });
    page.drawText("DAY", { x: startX + 10, y: startY - 19, size: 9, font: fontBold, color: palette.ink });

    periods.forEach((period, index) => {
      const x = startX + dayColWidth + index * periodColWidth;
      page.drawRectangle({
        x,
        y: startY - headerHeight,
        width: periodColWidth,
        height: headerHeight,
        borderWidth: 1,
        borderColor: palette.softBorder,
        color: palette.panelStrong,
      });
      page.drawText(`P${period}`, { x: x + 34, y: startY - 19, size: 10, font: fontBold, color: palette.ink });
    });

    days.forEach((day, rowIndex) => {
      const rowTop = startY - headerHeight - rowIndex * rowHeight;
      const rowBottom = rowTop - rowHeight;

      page.drawRectangle({
        x: startX,
        y: rowBottom,
        width: dayColWidth,
        height: rowHeight,
        borderWidth: 1,
        borderColor: palette.softBorder,
        color: rowIndex % 2 === 0 ? palette.panel : rgb(0.98, 0.98, 0.98),
      });
      page.drawText(prettyDay(day), { x: startX + 8, y: rowTop - 18, size: 10, font: fontBold, color: palette.ink });

      periods.forEach((period, colIndex) => {
        const x = startX + dayColWidth + colIndex * periodColWidth;
        page.drawRectangle({
          x,
          y: rowBottom,
          width: periodColWidth,
          height: rowHeight,
          borderWidth: 1,
          borderColor: palette.softBorder,
          color: rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.985, 0.985, 0.985),
        });

        const slot = gridMap.get(`${day}-${period}`);
        if (!slot) {
          page.drawText("-", {
            x: x + periodColWidth / 2 - 2,
            y: rowTop - 28,
            size: 9,
            font,
            color: palette.muted,
          });
          return;
        }

        const subject = resolveLabel(slot.subjectId, subjectLabelById).slice(0, 18);
        const teacher = resolveLabel(slot.teacherId, teacherLabelById).slice(0, 20);
        const time = `${slot.startTime} - ${slot.endTime}`.slice(0, 20);

        page.drawText(subject, {
          x: x + 4,
          y: rowTop - 15,
          size: 8,
          font: fontBold,
          color: palette.ink,
        });
        page.drawText(teacher, {
          x: x + 4,
          y: rowTop - 28,
          size: 7.2,
          font,
          color: palette.ink,
        });
        page.drawText(time, {
          x: x + 4,
          y: rowTop - 40,
          size: 7,
          font,
          color: palette.muted,
        });
      });
    });

    page.drawText("Generated by Ascento Admin Timetable", {
      x: 30,
      y: 20,
      size: 7,
      font,
      color: palette.muted,
    });

    const safeClass = (classId || "class").slice(0, 12);
    const fileName = `timetable-${safeClass}.pdf`;
    const bytes = await pdfDoc.save();
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(arrayBuffer).set(bytes);
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    return { blob, fileName };
  };

  const handleDownloadPdf = async () => {
    if (!classId) {
      toast.error("Select class before downloading timetable PDF");
      return;
    }

    try {
      setExportingPdf(true);
      const { blob, fileName } = await createTimetablePdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Timetable PDF downloaded");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate PDF"));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!classId) {
      toast.error("Select class before sharing timetable");
      return;
    }

    try {
      setSharingPdf(true);
      const { blob, fileName } = await createTimetablePdf();
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Class Timetable",
          text: "Sharing timetable PDF",
          files: [file],
        });
        toast.success("Timetable shared");
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Share not supported for files. Link copied instead.");
      } else {
        toast.error("Share not supported on this browser.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to share timetable"));
    } finally {
      setSharingPdf(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 bg-linear-to-r from-indigo-700 via-violet-600 to-sky-500 text-white shadow-lg">
        <div className="grid gap-4 p-1 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Schedule Studio</p>
            <h1 className="text-2xl font-semibold">Timetable</h1>
            <p className="text-sm text-white/90">A real timetable board for period planning with cleaner actions and better readability.</p>
            <div className="flex items-center gap-2 text-xs text-white/85">
              <Sparkles size={14} />
              <span>AI-style timetable sheet panel</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-200/35 blur-2xl" />
            <div className="absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-violet-200/35 blur-2xl" />
            <div className="relative space-y-2">
              <div className="flex items-center gap-2 text-white/90">
                <CalendarClock size={16} />
                <p className="text-sm font-medium">Weekly Timetable Layout</p>
              </div>
              <div className="space-y-2 rounded-lg bg-slate-950/45 p-2">
                <div className="h-2 w-28 rounded bg-sky-200/80" />
                <div className="h-2 w-40 rounded bg-white/80" />
                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 rounded bg-indigo-200/70" />
                  <div className="h-8 rounded bg-violet-200/70" />
                  <div className="h-8 rounded bg-sky-200/70" />
                  <div className="h-8 rounded bg-cyan-200/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => timetableQuery.refetch()} disabled={!classId}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={!classId || exportingPdf || sharingPdf}
              className="bg-linear-to-r from-sky-500 to-indigo-600 text-white hover:opacity-95"
            >
              <Download size={14} className="mr-2" />
              {exportingPdf ? "Preparing PDF..." : "Download PDF"}
            </Button>
            <Button variant="secondary" onClick={handleSharePdf} disabled={!classId || exportingPdf || sharingPdf}>
              <Share2 size={14} className="mr-2" />
              {sharingPdf ? "Sharing..." : "Share"}
            </Button>
            <Button onClick={() => openCreateModal()} disabled={!classId || !sectionId || !academicYearId}>
              <Plus size={14} className="mr-2" />
              Create Slot
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-xs text-zinc-500">Class</p>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select Class</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Section</p>
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">All Sections</option>
              {sectionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Academic Year</p>
            <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">Select Year</option>
              {yearOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isGridRefreshing ? (
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ) : null}

        <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-2 text-zinc-500">Day</th>
                {periods.map((period) => (
                  <th key={period} className="border px-2 py-2 text-zinc-500">
                    P{period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <td className="border px-2 py-2 font-medium">{prettyDay(day)}</td>
                  {periods.map((period) => {
                    const item = gridMap.get(`${day}-${period}`);
                    return (
                      <td key={`${day}-${period}`} className="border px-2 py-2 align-top">
                        {item ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">{resolveLabel(item.subjectId, subjectLabelById)}</p>
                            <p className="text-xs text-zinc-500">{resolveLabel(item.teacherId, teacherLabelById)}</p>
                            <p className="text-xs text-zinc-500">
                              {item.startTime}-{item.endTime}
                            </p>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => openEditModal(item)}>
                                <Pencil size={12} className="mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(item._id)}>
                                <Trash2 size={12} className="mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openCreateModal(day, period)}
                            disabled={!classId || !academicYearId}
                          >
                            <Plus size={12} className="mr-1" />
                            Add
                          </Button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!classId ? <p className="text-sm text-zinc-500">Select a class to load timetable slots.</p> : null}
        {classId && (!sectionId || !academicYearId) ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">Select section and academic year to create new timetable slots.</p>
        ) : null}
      </Card>

      <Modal open={open} onClose={closeModal} title={editingId ? "Update Timetable Slot" : "Create Timetable Slot"}>
        <div className="relative space-y-4">
          {isSaving ? (
            <div className="absolute inset-0 z-10 rounded-md bg-white/70 p-2 backdrop-blur-sm dark:bg-zinc-900/70">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-36" />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Class</p>
              <Select
                value={form.classId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    classId: e.target.value,
                    sectionId: "",
                  }))
                }
                disabled={isSaving}
              >
                <option value="">Select Class</option>
                {classOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">Section</p>
              <Select value={form.sectionId} onChange={(e) => setForm((prev) => ({ ...prev, sectionId: e.target.value }))} disabled={isSaving || !form.classId}>
                <option value="">Select Section</option>
                {formSectionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Subject</p>
              <Select value={form.subjectId} onChange={(e) => setForm((prev) => ({ ...prev, subjectId: e.target.value }))} disabled={isSaving}>
                <option value="">Select Subject</option>
                {subjectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">Teacher</p>
              <Select value={form.teacherId} onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))} disabled={isSaving}>
                <option value="">Select Teacher</option>
                {filteredTeacherOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {!assignmentsQuery.isError && form.classId && form.sectionId && form.subjectId && filteredTeacherOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No teacher assignment found for selected class, section, and subject.</p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Academic Year</p>
            <Select value={form.academicYearId} onChange={(e) => setForm((prev) => ({ ...prev, academicYearId: e.target.value }))} disabled={isSaving}>
              <option value="">Select Year</option>
              {yearOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Day</p>
              <Select value={form.dayOfWeek} onChange={(e) => setForm((prev) => ({ ...prev, dayOfWeek: e.target.value }))} disabled={isSaving}>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {prettyDay(day)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">Period</p>
              <Select
                value={String(form.periodNumber)}
                onChange={(e) => setForm((prev) => ({ ...prev, periodNumber: Number(e.target.value) }))}
                disabled={isSaving}
              >
                {periods.map((period) => (
                  <option key={period} value={period}>
                    Period {period}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Start Time</p>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))} disabled={isSaving} />
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">End Time</p>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))} disabled={isSaving} />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Status</p>
            <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} disabled={isSaving}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const payload = validateAndBuildPayload();
                if (!payload) {
                  return;
                }

                if (editingId) {
                  updateMutation.mutate({ id: editingId, payload });
                  return;
                }
                createMutation.mutate(payload);
              }}
              disabled={
                isSaving ||
                !form.classId ||
                !form.sectionId ||
                !form.subjectId ||
                !form.teacherId ||
                !form.academicYearId
              }
            >
              {isSaving ? "Saving..." : editingId ? "Update Slot" : "Create Slot"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
