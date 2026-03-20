"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpenCheck, BookText, Pencil, Plus, RefreshCcw, Search, Sparkles, Trash2 } from "lucide-react";
import axios from "axios";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { classesApi, subjectsApi } from "@/lib/api";

type SubjectRow = {
  _id?: string;
  name?: string;
  code?: string;
  classId?: string | { _id?: string; name?: string };
  description?: string;
};

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

function mapOptions(rows: Array<Record<string, unknown>>, labelKey: string): Option[] {
  return rows
    .map((row) => ({
      id: String(row._id ?? row.id ?? ""),
      label: String(row[labelKey] ?? row._id ?? ""),
    }))
    .filter((opt) => opt.id.length > 0);
}

export default function SubjectsPage() {
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
  const [open, setOpen] = useState(false);
  const [filterClassId, setFilterClassId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    classId: "",
    description: "",
  });
  const [editingId, setEditingId] = useState("");

  const classesQuery = useQuery({ queryKey: ["classes", "subjects"], queryFn: () => classesApi.list() });
  const subjectsQuery = useQuery({
    queryKey: ["subjects", filterClassId],
    queryFn: async () => subjectsApi.list(filterClassId ? { classId: filterClassId } : undefined),
  });

  const subjectRows = useMemo(() => toRows(subjectsQuery.data) as SubjectRow[], [subjectsQuery.data]);
  const classOptions = useMemo(() => mapOptions(toRows(classesQuery.data), "name"), [classesQuery.data]);
  const classLabelById = useMemo(() => {
    return classOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [classOptions]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return subjectRows.filter((row) => {
      const classIdValue = row.classId && typeof row.classId === "object" ? String(row.classId._id ?? "") : String(row.classId ?? "");
      const className =
        row.classId && typeof row.classId === "object"
          ? row.classId.name || row.classId._id || ""
          : classLabelById[classIdValue] || classIdValue;

      const matchesFilter = !filterClassId || classIdValue === filterClassId;
      const matchesSearch =
        !q ||
        String(row.name || "").toLowerCase().includes(q) ||
        String(row.code || "").toLowerCase().includes(q) ||
        String(className || "").toLowerCase().includes(q) ||
        String(row.description || "").toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [classLabelById, filterClassId, searchText, subjectRows]);

  const openCreateModal = () => {
    setEditingId("");
    setForm({
      name: "",
      code: "",
      classId: filterClassId || "",
      description: "",
    });
    setOpen(true);
  };

  const openEditModal = (row: SubjectRow) => {
    setEditingId(String(row._id ?? ""));
    setForm({
      name: row.name ?? "",
      code: row.code ?? "",
      classId: row.classId && typeof row.classId === "object" ? String(row.classId._id ?? "") : String(row.classId ?? ""),
      description: row.description ?? "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId("");
    setForm({ name: "", code: "", classId: "", description: "" });
  };

  const createMutation = useMutation({
    mutationFn: async () => subjectsApi.create(form),
    onSuccess: async () => {
      toast.success("Subject created");
      await queryClient.invalidateQueries({ queryKey: ["subjects"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create subject")),
  });

  const updateMutation = useMutation({
    mutationFn: async () => subjectsApi.update(editingId, form),
    onSuccess: async () => {
      toast.success("Subject updated");
      await queryClient.invalidateQueries({ queryKey: ["subjects"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update subject")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => subjectsApi.remove(id),
    onSuccess: async () => {
      toast.success("Subject deleted");
      await queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete subject")),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPageLoading = classesQuery.isLoading || subjectsQuery.isLoading;
  const isTableRefreshing = subjectsQuery.isFetching && !isPageLoading;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-36" />
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
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 text-white shadow-lg">
        <div className="grid gap-4 p-1 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Curriculum Studio</p>
            <h1 className="text-2xl font-semibold">Subjects</h1>
            <p className="text-sm text-white/90">A cleaner content hub for subject mapping, maintenance, and quick updates.</p>
            <div className="flex items-center gap-2 text-xs text-white/85">
              <Sparkles size={14} />
              <span>Visual learning-themed layout</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-300/35 blur-2xl" />
            <div className="relative space-y-2">
              <div className="flex items-center gap-2 text-white/90">
                <BookText size={16} />
                <p className="text-sm font-medium">AI-style Subject Blueprint</p>
              </div>
              <div className="space-y-2 rounded-lg bg-slate-950/40 p-2">
                <div className="h-2 w-20 rounded bg-cyan-200/70" />
                <div className="h-2 w-32 rounded bg-white/70" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded bg-indigo-200/70" />
                  <div className="h-10 rounded bg-cyan-200/70" />
                  <div className="h-10 rounded bg-sky-200/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Total Subjects</p>
            <p className="mt-1 text-2xl font-semibold">{subjectRows.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Mapped Classes</p>
            <p className="mt-1 text-2xl font-semibold">{classOptions.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Visible Rows</p>
            <p className="mt-1 text-2xl font-semibold">{filteredRows.length}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpenCheck size={18} className="text-cyan-600" />
            <h2 className="text-lg font-semibold">Subjects List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => subjectsQuery.refetch()}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateModal}>
              <Plus size={14} className="mr-2" />
              New Subject
            </Button>
          </div>
        </div>
        <p className="text-sm text-zinc-500">Search and filter to find subjects quickly, then edit in popup.</p>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search subject name, code, class"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterClassId} onChange={(event) => setFilterClassId(event.target.value)}>
              <option value="">All Classes</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => setFilterClassId("")}>Clear</Button>
          </div>
        </div>

        {isTableRefreshing ? (
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
                <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Code</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Class</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Description</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const id = row._id || `subject-${index}`;
                const classText =
                  row.classId && typeof row.classId === "object"
                    ? row.classId.name || row.classId._id || "-"
                    : classLabelById[String(row.classId ?? "")] || String(row.classId ?? "-");

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.name ?? "-"}</td>
                    <td className="px-4 py-3">{row.code ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{classText}</td>
                    <td className="max-w-[340px] px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.description ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(row)}
                        >
                          <Pencil size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => row._id && deleteMutation.mutate(String(row._id))}>
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

          {!filteredRows.length ? (
            <p className="px-4 py-3 text-sm text-zinc-500">No subjects match the current search or filter.</p>
          ) : null}
        </div>
      </Card>

      <Modal open={open} onClose={closeModal} title={editingId ? "Update Subject" : "Create Subject"}>
        <div className="relative space-y-4">
          {isSaving ? (
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
            <p className="mb-1 text-xs text-zinc-500">Subject Name</p>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Enter subject name"
              disabled={isSaving}
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Subject Code</p>
            <Input
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="Enter code"
              disabled={isSaving}
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Class</p>
            <Select
              value={form.classId}
              onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
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
            <p className="mb-1 text-xs text-zinc-500">Description</p>
            <Input
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Enter description"
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingId) {
                  updateMutation.mutate();
                  return;
                }
                createMutation.mutate();
              }}
              disabled={isSaving || !form.name.trim() || !form.code.trim() || !form.classId}
            >
              {isSaving ? "Saving..." : editingId ? "Update Subject" : "Create Subject"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
