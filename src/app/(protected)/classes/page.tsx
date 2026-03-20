"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, ListFilter, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import axios from "axios";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { classesApi, domainsApi } from "@/lib/api";

type ClassRow = {
  _id?: string;
  name?: string;
  domainId?: string | { _id?: string; name?: string };
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

export default function ClassesPage() {
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
  const [tableSearch, setTableSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    domainId: "",
    description: "",
  });
  const [editingId, setEditingId] = useState("");

  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: () => classesApi.list() });
  const domainsQuery = useQuery({ queryKey: ["domains", "classes"], queryFn: domainsApi.list });

  const classRows = useMemo(() => toRows(classesQuery.data) as ClassRow[], [classesQuery.data]);
  const domainOptions = useMemo(
    () => mapOptions(toRows(domainsQuery.data), "name"),
    [domainsQuery.data],
  );
  const domainLabelById = useMemo(() => {
    return domainOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [domainOptions]);

  const openCreateModal = () => {
    setEditingId("");
    setForm({
      name: "",
      domainId: domainFilter !== "all" ? domainFilter : "",
      description: "",
    });
    setOpen(true);
  };

  const openEditModal = (row: ClassRow) => {
    setEditingId(String(row._id ?? ""));
    setForm({
      name: row.name ?? "",
      domainId:
        row.domainId && typeof row.domainId === "object"
          ? String(row.domainId._id ?? "")
          : String(row.domainId ?? ""),
      description: row.description ?? "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId("");
    setForm({ name: "", domainId: "", description: "" });
  };

  const createMutation = useMutation({
    mutationFn: async () => classesApi.create(form),
    onSuccess: async () => {
      toast.success("Class created");
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create class")),
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      classesApi.update(editingId, {
        name: form.name,
        domainId: form.domainId,
        description: form.description,
      }),
    onSuccess: async () => {
      toast.success("Class updated");
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      closeModal();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update class")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => classesApi.remove(id),
    onSuccess: async () => {
      toast.success("Class deleted");
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete class")),
  });

  const filteredClassRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return classRows.filter((row) => {
      const domainObj = row.domainId && typeof row.domainId === "object" ? row.domainId : null;
      const domainId = domainObj?._id || String(row.domainId || "");
      const domainLabel = domainObj?.name || domainLabelById[domainId] || String(row.domainId || "");
      const matchesDomain = domainFilter === "all" || domainId === domainFilter;
      const matchesSearch =
        !q ||
        String(row.name || "").toLowerCase().includes(q) ||
        String(row.description || "").toLowerCase().includes(q) ||
        String(domainLabel).toLowerCase().includes(q);

      return matchesDomain && matchesSearch;
    });
  }, [classRows, domainFilter, domainLabelById, tableSearch]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPageLoading = classesQuery.isLoading || domainsQuery.isLoading;
  const isTableRefreshing = classesQuery.isFetching && !isPageLoading;

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
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 text-white shadow-lg">
        <div className="space-y-1 p-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">Academic Setup</p>
          <h1 className="text-2xl font-semibold">Classes</h1>
          <p className="text-sm text-white/85">Create and update classes in a popup form with a cleaner table view.</p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-zinc-500">Total Classes</p>
          <p className="mt-1 text-2xl font-semibold">{classRows.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Total Domains Linked</p>
          <p className="mt-1 text-2xl font-semibold">{domainOptions.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Visible In Table</p>
          <p className="mt-1 text-2xl font-semibold">{filteredClassRows.length}</p>
        </Card>
      </div>

      <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-blue-600" />
              <h2 className="text-lg font-semibold">Classes List</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => classesQuery.refetch()}>
                <RefreshCcw size={14} className="mr-2" />
                Refresh
              </Button>
              <Button onClick={openCreateModal}>
                <Plus size={14} className="mr-2" />
                New Class
              </Button>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Use search and domain filter to quickly find classes.</p>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                placeholder="Search classes"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <ListFilter size={16} className="text-zinc-500" />
              <Select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} className="w-52">
                <option value="all">All Domains</option>
                {domainOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
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
                  <th className="px-4 py-3 font-medium text-zinc-500">Class</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Domain</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassRows.map((row, index) => {
                  const id = row._id || `class-${index}`;
                  const domainObj = row.domainId && typeof row.domainId === "object" ? row.domainId : null;
                  return (
                    <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.name ?? "-"}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{domainObj?.name || String(row.domainId ?? "-")}</td>
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
          </div>

          {!filteredClassRows.length ? <p className="text-sm text-zinc-500">No classes found for current filters.</p> : null}
      </Card>

      <Modal open={open} onClose={closeModal} title={editingId ? "Update Class" : "Create Class"}>
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
            <p className="mb-1 text-xs text-zinc-500">Class Name</p>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Enter class name"
              disabled={isSaving}
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Domain</p>
            <Select
              value={form.domainId}
              onChange={(event) => setForm((prev) => ({ ...prev, domainId: event.target.value }))}
              disabled={isSaving}
            >
              <option value="">Select Domain</option>
              {domainOptions.map((option) => (
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
              disabled={isSaving || !form.name.trim() || !form.domainId}
            >
              {isSaving ? "Saving..." : editingId ? "Update Class" : "Create Class"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
