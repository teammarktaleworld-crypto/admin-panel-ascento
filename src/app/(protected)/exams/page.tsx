"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import axios from "axios";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { examSubjectsApi, examsApi } from "@/lib/api";
import { classesApi, subjectsApi, yearsApi } from "@/lib/api";

type SelectOption = {
  id: string;
  label: string;
};

type ExamRow = {
  _id?: string;
  examName?: string;
  classId?: string | { _id?: string; name?: string };
  academicYearId?: string | { _id?: string; name?: string };
  examStartDate?: string;
  examEndDate?: string;
  description?: string;
  status?: string;
};

type ExamSubjectRow = {
  _id?: string;
  examId?: string | { _id?: string; examName?: string };
  subjectId?: string | { _id?: string; name?: string; code?: string };
  totalMarks?: number;
  passingMarks?: number;
  examDate?: string;
  startTime?: string;
  endTime?: string;
};

function toRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  if (data && typeof data === "object") {
    const container = data as { data?: unknown; items?: unknown };
    if (Array.isArray(container.data)) {
      return container.data as Array<Record<string, unknown>>;
    }
    if (Array.isArray(container.items)) {
      return container.items as Array<Record<string, unknown>>;
    }
  }
  return [];
}

function mapOptions(rows: Array<Record<string, unknown>>, labelKeys: string[]): SelectOption[] {
  return rows
    .map((row) => {
      const id = String(row._id ?? row.id ?? "");
      const label =
        labelKeys.map((key) => String(row[key] ?? "").trim()).find((value) => value.length > 0) ?? id;
      return { id, label };
    })
    .filter((entry) => entry.id.length > 0);
}

export default function ExamsPage() {
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
  const [openExamModal, setOpenExamModal] = useState(false);
  const [openSubjectModal, setOpenSubjectModal] = useState(false);
  const [examSearch, setExamSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [filters, setFilters] = useState({ classId: "", academicYearId: "" });
  const [examForm, setExamForm] = useState({
    examName: "",
    classId: "",
    academicYearId: "",
    examStartDate: "",
    examEndDate: "",
    description: "",
    status: "active",
  });
  const [editingExamId, setEditingExamId] = useState("");

  const [selectedExamForSubjects, setSelectedExamForSubjects] = useState("");
  const [subjectForm, setSubjectForm] = useState({
    examId: "",
    subjectId: "",
    totalMarks: "",
    passingMarks: "",
    examDate: "",
    startTime: "09:00",
    endTime: "12:00",
  });
  const [editingExamSubjectId, setEditingExamSubjectId] = useState("");

  const classesQuery = useQuery({ queryKey: ["classes", "exams"], queryFn: () => classesApi.list() });
  const yearsQuery = useQuery({ queryKey: ["years", "exams"], queryFn: () => yearsApi.list() });
  const subjectsQuery = useQuery({ queryKey: ["subjects", "exams"], queryFn: () => subjectsApi.list() });

  const examsQuery = useQuery({
    queryKey: ["exams", filters.classId, filters.academicYearId],
    queryFn: async () =>
      (await examsApi.list({
        classId: filters.classId,
        academicYearId: filters.academicYearId,
      })) as ExamRow[],
  });

  const examSubjectsQuery = useQuery({
    queryKey: ["exam-subjects", selectedExamForSubjects],
    queryFn: async () => (await examSubjectsApi.list(selectedExamForSubjects)) as ExamSubjectRow[],
    enabled: selectedExamForSubjects.length > 0,
  });

  const classOptions = useMemo(() => mapOptions(toRows(classesQuery.data), ["name"]), [classesQuery.data]);
  const yearOptions = useMemo(() => mapOptions(toRows(yearsQuery.data), ["name"]), [yearsQuery.data]);
  const subjectOptions = useMemo(() => mapOptions(toRows(subjectsQuery.data), ["name", "code"]), [subjectsQuery.data]);

  const examRows = useMemo(() => toRows(examsQuery.data) as ExamRow[], [examsQuery.data]);
  const examSubjectRows = useMemo(
    () => toRows(examSubjectsQuery.data) as ExamSubjectRow[],
    [examSubjectsQuery.data],
  );

  const classLabelById = useMemo(() => {
    return classOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [classOptions]);

  const yearLabelById = useMemo(() => {
    return yearOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [yearOptions]);

  const subjectLabelById = useMemo(() => {
    return subjectOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [subjectOptions]);

  const toRef = (value: string | { _id?: string } | undefined) => {
    if (value && typeof value === "object") {
      return String(value._id ?? "");
    }
    return String(value ?? "");
  };

  const toRefLabel = (
    value: string | { _id?: string; name?: string; examName?: string; code?: string } | undefined,
    map: Record<string, string>,
  ) => {
    if (value && typeof value === "object") {
      return value.name || value.examName || value.code || value._id || "-";
    }
    const id = String(value ?? "");
    return map[id] || id || "-";
  };

  const filteredExams = useMemo(() => {
    const q = examSearch.trim().toLowerCase();
    return examRows.filter((row) => {
      const classId = toRef(row.classId);
      const yearId = toRef(row.academicYearId);
      const classLabel = toRefLabel(row.classId, classLabelById);
      const yearLabel = toRefLabel(row.academicYearId, yearLabelById);

      const matchesFilters =
        (!filters.classId || classId === filters.classId) &&
        (!filters.academicYearId || yearId === filters.academicYearId);
      const matchesSearch =
        !q ||
        String(row.examName || "").toLowerCase().includes(q) ||
        String(classLabel).toLowerCase().includes(q) ||
        String(yearLabel).toLowerCase().includes(q) ||
        String(row.description || "").toLowerCase().includes(q);

      return matchesFilters && matchesSearch;
    });
  }, [classLabelById, examRows, examSearch, filters.academicYearId, filters.classId, yearLabelById]);

  const filteredExamSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    return examSubjectRows.filter((row) => {
      const subjectLabel = toRefLabel(row.subjectId, subjectLabelById);
      return (
        !q ||
        String(subjectLabel).toLowerCase().includes(q) ||
        String(row.examDate || "").toLowerCase().includes(q)
      );
    });
  }, [examSubjectRows, subjectLabelById, subjectSearch]);

  const openCreateExamModal = () => {
    setEditingExamId("");
    setExamForm({
      examName: "",
      classId: filters.classId || "",
      academicYearId: filters.academicYearId || "",
      examStartDate: "",
      examEndDate: "",
      description: "",
      status: "active",
    });
    setOpenExamModal(true);
  };

  const openEditExamModal = (row: ExamRow) => {
    setEditingExamId(String(row._id ?? ""));
    setExamForm({
      examName: row.examName ?? "",
      classId: toRef(row.classId),
      academicYearId: toRef(row.academicYearId),
      examStartDate: String(row.examStartDate ?? "").slice(0, 10),
      examEndDate: String(row.examEndDate ?? "").slice(0, 10),
      description: row.description ?? "",
      status: row.status ?? "active",
    });
    setOpenExamModal(true);
  };

  const closeExamModal = () => {
    setOpenExamModal(false);
    setEditingExamId("");
    setExamForm({
      examName: "",
      classId: "",
      academicYearId: "",
      examStartDate: "",
      examEndDate: "",
      description: "",
      status: "active",
    });
  };

  const openCreateSubjectModal = () => {
    setEditingExamSubjectId("");
    setSubjectForm({
      examId: selectedExamForSubjects,
      subjectId: "",
      totalMarks: "100",
      passingMarks: "35",
      examDate: "",
      startTime: "09:00",
      endTime: "12:00",
    });
    setOpenSubjectModal(true);
  };

  const openEditSubjectModal = (row: ExamSubjectRow) => {
    setEditingExamSubjectId(String(row._id ?? ""));
    setSubjectForm({
      examId: toRef(row.examId) || selectedExamForSubjects,
      subjectId: toRef(row.subjectId),
      totalMarks: String(row.totalMarks ?? 100),
      passingMarks: String(row.passingMarks ?? 35),
      examDate: String(row.examDate ?? "").slice(0, 10),
      startTime: row.startTime ?? "09:00",
      endTime: row.endTime ?? "12:00",
    });
    setOpenSubjectModal(true);
  };

  const closeSubjectModal = () => {
    setOpenSubjectModal(false);
    setEditingExamSubjectId("");
    setSubjectForm({
      examId: selectedExamForSubjects,
      subjectId: "",
      totalMarks: "",
      passingMarks: "",
      examDate: "",
      startTime: "09:00",
      endTime: "12:00",
    });
  };

  const createExamMutation = useMutation({
    mutationFn: async () => examsApi.create(examForm),
    onSuccess: async () => {
      toast.success("Exam created");
      await queryClient.invalidateQueries({ queryKey: ["exams"] });
      closeExamModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create exam")),
  });

  const updateExamMutation = useMutation({
    mutationFn: async () => examsApi.update(editingExamId, examForm),
    onSuccess: async () => {
      toast.success("Exam updated");
      await queryClient.invalidateQueries({ queryKey: ["exams"] });
      closeExamModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update exam")),
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => examsApi.remove(id),
    onSuccess: async () => {
      toast.success("Exam deleted");
      await queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete exam")),
  });

  const createExamSubjectMutation = useMutation({
    mutationFn: async () =>
      examSubjectsApi.create({
        ...subjectForm,
        examId: subjectForm.examId || selectedExamForSubjects,
        totalMarks: Number(subjectForm.totalMarks),
        passingMarks: Number(subjectForm.passingMarks),
      }),
    onSuccess: async () => {
      toast.success("Exam subject created");
      await queryClient.invalidateQueries({ queryKey: ["exam-subjects"] });
      closeSubjectModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create exam subject")),
  });

  const updateExamSubjectMutation = useMutation({
    mutationFn: async () =>
      examSubjectsApi.update(editingExamSubjectId, {
        ...subjectForm,
        examId: subjectForm.examId || selectedExamForSubjects,
        totalMarks: Number(subjectForm.totalMarks),
        passingMarks: Number(subjectForm.passingMarks),
      }),
    onSuccess: async () => {
      toast.success("Exam subject updated");
      await queryClient.invalidateQueries({ queryKey: ["exam-subjects"] });
      closeSubjectModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update exam subject")),
  });

  const deleteExamSubjectMutation = useMutation({
    mutationFn: async (id: string) => examSubjectsApi.remove(id),
    onSuccess: async () => {
      toast.success("Exam subject deleted");
      await queryClient.invalidateQueries({ queryKey: ["exam-subjects"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete exam subject")),
  });

  const isExamSaving = createExamMutation.isPending || updateExamMutation.isPending;
  const isSubjectSaving = createExamSubjectMutation.isPending || updateExamSubjectMutation.isPending;
  const isPageLoading = classesQuery.isLoading || yearsQuery.isLoading || subjectsQuery.isLoading || examsQuery.isLoading;
  const isExamTableRefreshing = examsQuery.isFetching && !isPageLoading;
  const isSubjectTableRefreshing = examSubjectsQuery.isFetching && selectedExamForSubjects.length > 0;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-10 w-full md:col-span-2" />
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
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-500 text-white shadow-lg">
        <div className="grid gap-4 p-1 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Examination Studio</p>
            <h1 className="text-2xl font-semibold">Exams & Subject Scheduling</h1>
            <p className="text-sm text-white/90">Run complete exam planning with better structure, stronger visuals, and smooth interactions.</p>
            <div className="flex items-center gap-2 text-xs text-white/85">
              <Sparkles size={14} />
              <span>AI-style exam sheet preview panel</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-200/40 blur-2xl" />
            <div className="absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-blue-200/40 blur-2xl" />
            <div className="relative space-y-2">
              <div className="flex items-center gap-2 text-white/90">
                <FileSpreadsheet size={16} />
                <p className="text-sm font-medium">Exam Sheet Layout</p>
              </div>
              <div className="space-y-2 rounded-lg bg-slate-950/45 p-2">
                <div className="h-2 w-24 rounded bg-cyan-200/80" />
                <div className="h-2 w-40 rounded bg-white/80" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded bg-indigo-200/75" />
                  <div className="h-10 rounded bg-sky-200/75" />
                  <div className="h-10 rounded bg-cyan-200/75" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Total Exams</p>
            <p className="mt-1 text-2xl font-semibold">{examRows.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Subject Slots</p>
            <p className="mt-1 text-2xl font-semibold">{examSubjectRows.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Active Exams</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {examRows.filter((row) => String(row.status || "").toLowerCase() === "active").length}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Filtered Exams</p>
            <p className="mt-1 text-2xl font-semibold">{filteredExams.length}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold">Exam List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => examsQuery.refetch()}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateExamModal}>
              <Plus size={14} className="mr-2" />
              New Exam
            </Button>
          </div>
        </div>
        <p className="text-sm text-zinc-500">Manage exam windows and assign class-year combinations with easy filtering.</p>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={examSearch}
              onChange={(event) => setExamSearch(event.target.value)}
              placeholder="Search exam name, class, year"
              className="pl-9"
            />
          </div>

          <Select value={filters.classId} onChange={(event) => setFilters((prev) => ({ ...prev, classId: event.target.value }))}>
            <option value="">All Classes</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={filters.academicYearId}
            onChange={(event) => setFilters((prev) => ({ ...prev, academicYearId: event.target.value }))}
          >
            <option value="">All Years</option>
            {yearOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {isExamTableRefreshing ? (
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ) : null}

        <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-500">Exam Name</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Class</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Academic Year</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Duration</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.map((row, index) => {
                const id = row._id || `exam-${index}`;
                const classLabel = toRefLabel(row.classId, classLabelById);
                const yearLabel = toRefLabel(row.academicYearId, yearLabelById);
                const statusValue = String(row.status || "inactive").toLowerCase();

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.examName ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{classLabel}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{yearLabel}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {String(row.examStartDate ?? "").slice(0, 10)} to {String(row.examEndDate ?? "").slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          statusValue === "active"
                            ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }
                      >
                        {statusValue}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditExamModal(row)}
                        >
                          <Pencil size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => row._id && deleteExamMutation.mutate(row._id)}>
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const examId = String(row._id ?? "");
                            setSelectedExamForSubjects(examId);
                            setSubjectForm((prev) => ({ ...prev, examId }));
                          }}
                        >
                          Subjects
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filteredExams.length ? (
            <p className="px-4 py-3 text-sm text-zinc-500">No exams match the current filters or search.</p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">Exam Subject Slots</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => examSubjectsQuery.refetch()} disabled={!selectedExamForSubjects}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateSubjectModal} disabled={!selectedExamForSubjects}>
              <Plus size={14} className="mr-2" />
              New Slot
            </Button>
          </div>
        </div>

        {!selectedExamForSubjects ? <p className="text-sm text-zinc-500">Select an exam above to load exam subjects.</p> : null}

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            value={subjectSearch}
            onChange={(event) => setSubjectSearch(event.target.value)}
            placeholder="Search by subject or exam date"
            className="pl-9"
            disabled={!selectedExamForSubjects}
          />
        </div>

        {isSubjectTableRefreshing ? (
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ) : null}

        <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-500">Subject</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Marks</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Exam Date</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Time</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExamSubjects.map((row, index) => {
                const id = row._id || `subject-row-${index}`;
                const subjectLabel = toRefLabel(row.subjectId, subjectLabelById);

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{subjectLabel}</td>
                    <td className="px-4 py-3">
                      {row.passingMarks ?? 0}/{row.totalMarks ?? 0}
                    </td>
                    <td className="px-4 py-3">{String(row.examDate ?? "").slice(0, 10) || "-"}</td>
                    <td className="px-4 py-3">
                      {row.startTime ?? "-"} - {row.endTime ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditSubjectModal(row)}
                        >
                          <Pencil size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => row._id && deleteExamSubjectMutation.mutate(String(row._id))}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filteredExamSubjects.length && selectedExamForSubjects ? (
            <p className="px-4 py-3 text-sm text-zinc-500">No exam subject slots match current search.</p>
          ) : null}
        </div>
      </Card>

      <Modal open={openExamModal} onClose={closeExamModal} title={editingExamId ? "Update Exam" : "Create Exam"}>
        <div className="relative space-y-4">
          {isExamSaving ? (
            <div className="absolute inset-0 z-10 rounded-md bg-white/70 p-2 backdrop-blur-sm dark:bg-zinc-900/70">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-36" />
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs text-zinc-500">Exam Name</p>
            <Input
              value={examForm.examName}
              onChange={(event) => setExamForm((prev) => ({ ...prev, examName: event.target.value }))}
              placeholder="Enter exam name"
              disabled={isExamSaving}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Class</p>
              <Select
                value={examForm.classId}
                onChange={(event) => setExamForm((prev) => ({ ...prev, classId: event.target.value }))}
                disabled={isExamSaving}
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
              <p className="mb-1 text-xs text-zinc-500">Academic Year</p>
              <Select
                value={examForm.academicYearId}
                onChange={(event) => setExamForm((prev) => ({ ...prev, academicYearId: event.target.value }))}
                disabled={isExamSaving}
              >
                <option value="">Select Year</option>
                {yearOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Start Date</p>
              <Input
                type="date"
                value={examForm.examStartDate}
                onChange={(event) => setExamForm((prev) => ({ ...prev, examStartDate: event.target.value }))}
                disabled={isExamSaving}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">End Date</p>
              <Input
                type="date"
                value={examForm.examEndDate}
                onChange={(event) => setExamForm((prev) => ({ ...prev, examEndDate: event.target.value }))}
                disabled={isExamSaving}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Description</p>
            <Input
              value={examForm.description}
              onChange={(event) => setExamForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Enter description"
              disabled={isExamSaving}
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Status</p>
            <Select
              value={examForm.status}
              onChange={(event) => setExamForm((prev) => ({ ...prev, status: event.target.value }))}
              disabled={isExamSaving}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeExamModal} disabled={isExamSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingExamId) {
                  updateExamMutation.mutate();
                  return;
                }
                createExamMutation.mutate();
              }}
              disabled={
                isExamSaving ||
                !examForm.examName.trim() ||
                !examForm.classId ||
                !examForm.academicYearId ||
                !examForm.examStartDate ||
                !examForm.examEndDate
              }
            >
              {isExamSaving ? "Saving..." : editingExamId ? "Update Exam" : "Create Exam"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={openSubjectModal} onClose={closeSubjectModal} title={editingExamSubjectId ? "Update Subject Slot" : "Create Subject Slot"}>
        <div className="relative space-y-4">
          {isSubjectSaving ? (
            <div className="absolute inset-0 z-10 rounded-md bg-white/70 p-2 backdrop-blur-sm dark:bg-zinc-900/70">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-36" />
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs text-zinc-500">Exam</p>
            <Select
              value={subjectForm.examId || selectedExamForSubjects}
              onChange={(event) => {
                setSubjectForm((prev) => ({ ...prev, examId: event.target.value }));
                setSelectedExamForSubjects(event.target.value);
              }}
              disabled={isSubjectSaving}
            >
              <option value="">Select Exam</option>
              {examRows.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.examName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Subject</p>
            <Select
              value={subjectForm.subjectId}
              onChange={(event) => setSubjectForm((prev) => ({ ...prev, subjectId: event.target.value }))}
              disabled={isSubjectSaving}
            >
              <option value="">Select Subject</option>
              {subjectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Total Marks</p>
              <Input
                type="number"
                value={subjectForm.totalMarks}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, totalMarks: event.target.value }))}
                disabled={isSubjectSaving}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">Passing Marks</p>
              <Input
                type="number"
                value={subjectForm.passingMarks}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, passingMarks: event.target.value }))}
                disabled={isSubjectSaving}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Exam Date</p>
            <Input
              type="date"
              value={subjectForm.examDate}
              onChange={(event) => setSubjectForm((prev) => ({ ...prev, examDate: event.target.value }))}
              disabled={isSubjectSaving}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Start Time</p>
              <Input
                type="time"
                value={subjectForm.startTime}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, startTime: event.target.value }))}
                disabled={isSubjectSaving}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">End Time</p>
              <Input
                type="time"
                value={subjectForm.endTime}
                onChange={(event) => setSubjectForm((prev) => ({ ...prev, endTime: event.target.value }))}
                disabled={isSubjectSaving}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeSubjectModal} disabled={isSubjectSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingExamSubjectId) {
                  updateExamSubjectMutation.mutate();
                  return;
                }
                createExamSubjectMutation.mutate();
              }}
              disabled={
                isSubjectSaving ||
                !(subjectForm.examId || selectedExamForSubjects) ||
                !subjectForm.subjectId ||
                !subjectForm.totalMarks ||
                !subjectForm.passingMarks ||
                !subjectForm.examDate
              }
            >
              {isSubjectSaving ? "Saving..." : editingExamSubjectId ? "Update Slot" : "Create Slot"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
