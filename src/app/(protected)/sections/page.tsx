"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers3, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import axios from "axios";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { classesApi, sectionsApi } from "@/lib/api";

type SectionRow = {
  _id?: string;
  name?: string;
  classId?: string | { _id?: string; name?: string };
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

export default function SectionsPage() {
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
    classId: "",
  });
  const [editingId, setEditingId] = useState("");

  const classesQuery = useQuery({ queryKey: ["classes", "sections"], queryFn: () => classesApi.list() });
  const sectionsQuery = useQuery({
    queryKey: ["sections", filterClassId],
    queryFn: async () => sectionsApi.list(filterClassId ? { classId: filterClassId } : undefined),
  });

  const sectionRows = useMemo(() => toRows(sectionsQuery.data) as SectionRow[], [sectionsQuery.data]);
  const classOptions = useMemo(() => mapOptions(toRows(classesQuery.data), "name"), [classesQuery.data]);
  const classLabelById = useMemo(() => {
    return classOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [classOptions]);
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return sectionRows.filter((row) => {
      const className =
        row.classId && typeof row.classId === "object"
          ? row.classId.name || row.classId._id || ""
          : classLabelById[String(row.classId ?? "")] || String(row.classId ?? "");

      const matchesSearch =
        !q ||
        String(row.name || "").toLowerCase().includes(q) ||
        String(className).toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [classLabelById, searchText, sectionRows]);

  const openCreateModal = () => {
    setEditingId("");
    setForm({ name: "", classId: filterClassId || "" });
    setOpen(true);
  };

  const openEditModal = (row: SectionRow) => {
    setEditingId(String(row._id ?? ""));
    setForm({
      name: row.name ?? "",
      classId:
        row.classId && typeof row.classId === "object"
          ? String(row.classId._id ?? "")
          : String(row.classId ?? ""),
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId("");
    setForm({ name: "", classId: "" });
  };

  const createMutation = useMutation({
    mutationFn: async () => sectionsApi.create(form),
    onSuccess: async () => {
      toast.success("Section created");
      await queryClient.invalidateQueries({ queryKey: ["sections"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create section")),
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      sectionsApi.update(editingId, {
        name: form.name,
        classId: form.classId,
      }),
    onSuccess: async () => {
      toast.success("Section updated");
      await queryClient.invalidateQueries({ queryKey: ["sections"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update section")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => sectionsApi.remove(id),
    onSuccess: async () => {
      toast.success("Section deleted");
      await queryClient.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete section")),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPageLoading = classesQuery.isLoading || sectionsQuery.isLoading;
  const isTableRefreshing = sectionsQuery.isFetching && !isPageLoading;

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
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-lg">
        <div className="space-y-1 p-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">Academic Setup</p>
          <h1 className="text-2xl font-semibold">Sections</h1>
          <p className="text-sm text-white/85">Create and update sections in a popup form with cleaner list controls.</p>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers3 size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">Sections List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => sectionsQuery.refetch()}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateModal}>
              <Plus size={14} className="mr-2" />
              New Section
            </Button>
          </div>
        </div>
        <p className="text-sm text-zinc-500">Use search and class filter to quickly find sections.</p>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search section or class"
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
                <th className="px-4 py-3 font-medium text-zinc-500">Section</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Class</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const id = row._id || `section-${index}`;
                const classText =
                  row.classId && typeof row.classId === "object"
                    ? row.classId.name || row.classId._id || "-"
                    : classLabelById[String(row.classId ?? "")] || String(row.classId ?? "-");

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.name ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{classText}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(row)}>
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
            <p className="px-4 py-3 text-sm text-zinc-500">No sections match the current search or filter.</p>
          ) : null}
        </div>
      </Card>

      <Modal open={open} onClose={closeModal} title={editingId ? "Update Section" : "Create Section"}>
        <div className="relative space-y-4">
          {isSaving ? (
            <div className="absolute inset-0 z-10 rounded-md bg-white/70 p-2 backdrop-blur-sm dark:bg-zinc-900/70">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-36" />
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs text-zinc-500">Section Name</p>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Enter section name"
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
              disabled={isSaving || !form.name.trim() || !form.classId}
            >
              {isSaving ? "Saving..." : editingId ? "Update Section" : "Create Section"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
