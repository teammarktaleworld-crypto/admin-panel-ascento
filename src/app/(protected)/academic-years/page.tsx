"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CalendarRange,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { yearsApi } from "@/lib/api";

type AcademicYearRow = {
  _id?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: "active" | "inactive" | string;
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

function toDateInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export default function AcademicYearsPage() {
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
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    status: "active",
  });

  const yearsQuery = useQuery({ queryKey: ["academic-years"], queryFn: () => yearsApi.list() });

  const rows = useMemo(() => toRows(yearsQuery.data) as AcademicYearRow[], [yearsQuery.data]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        String(row.name || "").toLowerCase().includes(q) ||
        String(row.startDate || "").toLowerCase().includes(q) ||
        String(row.endDate || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || String(row.status || "").toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, searchText, statusFilter]);

  const activeCount = rows.filter((row) => String(row.status || "").toLowerCase() === "active").length;
  const inactiveCount = rows.filter((row) => String(row.status || "").toLowerCase() === "inactive").length;

  const openCreateModal = () => {
    setEditingId("");
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      status: "active",
    });
    setOpen(true);
  };

  const openEditModal = (row: AcademicYearRow) => {
    setEditingId(String(row._id ?? ""));
    setForm({
      name: row.name ?? "",
      startDate: toDateInput(row.startDate),
      endDate: toDateInput(row.endDate),
      status: String(row.status || "active"),
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId("");
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      status: "active",
    });
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      yearsApi.create({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      }),
    onSuccess: async () => {
      toast.success("Academic year created");
      await queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create academic year"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      yearsApi.update(editingId, {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      }),
    onSuccess: async () => {
      toast.success("Academic year updated");
      await queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update academic year"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => yearsApi.remove(id),
    onSuccess: async () => {
      toast.success("Academic year deleted");
      await queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete academic year"));
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPageLoading = yearsQuery.isLoading;
  const isTableRefreshing = yearsQuery.isFetching && !isPageLoading;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
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
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 text-white shadow-lg">
        <div className="grid gap-4 p-1 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Session Planning</p>
            <h1 className="text-2xl font-semibold">Academic Years</h1>
            <p className="text-sm text-white/90">Manage year cycles with a cleaner structure, clearer status, and smoother operations.</p>
            <div className="flex items-center gap-2 text-xs text-white/85">
              <Sparkles size={14} />
              <span>Visual planning panel</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-teal-200/40 blur-2xl" />
            <div className="absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />
            <div className="relative space-y-2">
              <div className="flex items-center gap-2 text-white/90">
                <CalendarRange size={16} />
                <p className="text-sm font-medium">AI-style Academic Timeline</p>
              </div>
              <div className="space-y-2 rounded-lg bg-slate-950/40 p-2">
                <div className="h-2 w-24 rounded bg-teal-200/80" />
                <div className="h-2 w-36 rounded bg-white/75" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded bg-emerald-200/70" />
                  <div className="h-10 rounded bg-cyan-200/70" />
                  <div className="h-10 rounded bg-sky-200/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Total Years</p>
            <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Active</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Inactive</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">{inactiveCount}</p>
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
            <CalendarCheck2 size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">Academic Years List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => yearsQuery.refetch()}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateModal}>
              <Plus size={14} className="mr-2" />
              New Year
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search year name or date"
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
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
                <th className="px-4 py-3 font-medium text-zinc-500">Start Date</th>
                <th className="px-4 py-3 font-medium text-zinc-500">End Date</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, index) => {
                const id = row._id || `year-${index}`;
                const statusValue = String(row.status || "inactive").toLowerCase();

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.name || "-"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{toDateInput(row.startDate) || "-"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{toDateInput(row.endDate) || "-"}</td>
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
                        <Button size="sm" variant="outline" onClick={() => openEditModal(row)}>
                          <Pencil size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => row._id && deleteMutation.mutate(String(row._id))}
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

          {!filteredRows.length ? (
            <p className="px-4 py-3 text-sm text-zinc-500">No academic years match the current search or filter.</p>
          ) : null}
        </div>
      </Card>

      <Modal open={open} onClose={closeModal} title={editingId ? "Update Academic Year" : "Create Academic Year"}>
        <div className="relative space-y-4">
          {isSaving ? (
            <div className="absolute inset-0 z-10 rounded-md bg-white/70 p-2 backdrop-blur-sm dark:bg-zinc-900/70">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-36" />
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs text-zinc-500">Year Name</p>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Example: 2026-2027-001"
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-zinc-500">Start Date</p>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                disabled={isSaving}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-500">End Date</p>
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Status</p>
            <Select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              disabled={isSaving}
            >
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
                if (editingId) {
                  updateMutation.mutate();
                  return;
                }
                createMutation.mutate();
              }}
              disabled={isSaving || !form.name.trim() || !form.startDate || !form.endDate}
            >
              {isSaving ? "Saving..." : editingId ? "Update Year" : "Create Year"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
