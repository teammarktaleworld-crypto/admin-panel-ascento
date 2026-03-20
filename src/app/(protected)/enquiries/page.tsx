"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, MailQuestion, Pencil, RefreshCcw, Search, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { enquiriesApi } from "@/lib/api";

type EnquiryRow = {
  _id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  message?: string;
  course?: string;
  className?: string;
  status?: string;
  createdAt?: string;
};

type UpdateForm = {
  status: string;
  message: string;
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

function generateEnquiryAiImage(seedText: string) {
  const seed = `${seedText || "enquiry"}-${Date.now()}`;
  return `https://api.dicebear.com/9.x/shapes/png?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

export default function EnquiriesPage() {
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
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState(generateEnquiryAiImage("enquiry-initial"));
  const [form, setForm] = useState<UpdateForm>({
    status: "in-progress",
    message: "Admission details shared via email",
  });

  const listQuery = useQuery({
    queryKey: ["enquiries"],
    queryFn: () => enquiriesApi.list(),
  });

  const rows = useMemo(() => toRows(listQuery.data) as EnquiryRow[], [listQuery.data]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      const fullName = row.fullName || row.name || "";
      const matchesStatus = statusFilter === "all" || String(row.status || "").toLowerCase() === statusFilter;
      const matchesSearch =
        !q ||
        String(fullName).toLowerCase().includes(q) ||
        String(row.email || "").toLowerCase().includes(q) ||
        String(row.phone || "").toLowerCase().includes(q) ||
        String(row.message || "").toLowerCase().includes(q) ||
        String(row.course || row.className || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [rows, searchText, statusFilter]);

  const updateMutation = useMutation({
    mutationFn: async () => enquiriesApi.update(editingId, form),
    onSuccess: async () => {
      toast.success("Enquiry updated");
      setEditOpen(false);
      setEditingId("");
      await queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update enquiry")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => enquiriesApi.remove(id),
    onSuccess: async () => {
      toast.success("Enquiry deleted");
      await queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete enquiry")),
  });

  const openEdit = (row: EnquiryRow) => {
    setEditingId(String(row._id ?? ""));
    setForm({
      status: String(row.status || "in-progress"),
      message: String(row.message || "Admission details shared via email"),
    });
    const seedBase = `${row.fullName || row.name || row.email || row._id || "enquiry"}`;
    setAiImageUrl(generateEnquiryAiImage(seedBase));
    setEditOpen(true);
  };

  const handleDelete = (row: EnquiryRow) => {
    if (!row._id) {
      return;
    }
    const ok = window.confirm(`Delete enquiry ${row.fullName || row.name || row.email || "record"}?`);
    if (!ok) {
      return;
    }
    deleteMutation.mutate(String(row._id));
  };

  const isPageLoading = listQuery.isLoading;
  const isTableRefreshing = listQuery.isFetching && !isPageLoading;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-10 w-full md:col-span-2" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 bg-linear-to-r from-fuchsia-600 via-pink-500 to-rose-500 text-white shadow-lg">
        <div className="grid gap-4 p-1 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/85">Admissions Desk</p>
            <h1 className="text-2xl font-semibold">Enquiries</h1>
            <p className="text-sm text-white/90">Better enquiry pipeline view with clean updates, safe delete, and AI-style visual support.</p>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <Bot size={14} />
              <span>AI generated enquiry visual cards</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-rose-300/35 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-fuchsia-300/35 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <img
                src={aiImageUrl}
                alt="AI enquiry visual"
                className="h-16 w-16 rounded-xl border border-white/60 bg-white/75 object-cover"
                onError={(event) => {
                  event.currentTarget.src = "https://api.dicebear.com/9.x/shapes/png?seed=enquiry-fallback";
                }}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">AI Enquiry Insight Card</p>
                <p className="text-xs text-white/85">Visual context for faster counselling follow-up in update form.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-zinc-500">Total Enquiries</p>
          <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">In Progress</p>
          <p className="mt-1 text-2xl font-semibold">{rows.filter((row) => String(row.status || "").toLowerCase() === "in-progress").length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Visible Rows</p>
          <p className="mt-1 text-2xl font-semibold">{filteredRows.length}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MailQuestion size={18} className="text-pink-600" />
            <h2 className="text-lg font-semibold">Enquiry List</h2>
          </div>
          <Button variant="outline" onClick={() => listQuery.refetch()}>
            <RefreshCcw size={14} className="mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search name, email, phone, course, message"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </div>

        {isTableRefreshing ? (
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : null}

        <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-500">Contact</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Interest</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Message</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Created</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const id = row._id || `enquiry-${index}`;
                const status = String(row.status || "new").toLowerCase();
                const person = row.fullName || row.name || "-";
                const course = row.course || row.className || "General";

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{person}</p>
                      <p className="text-xs text-zinc-500">{row.email || "-"}</p>
                      <p className="text-xs text-zinc-500">{row.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{course}</td>
                    <td className="max-w-[320px] px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.message || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          status === "resolved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : status === "in-progress"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{String(row.createdAt || "").slice(0, 10) || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                          <Pencil size={14} className="mr-1" />
                          Update
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(row)} disabled={deleteMutation.isPending}>
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                    No enquiries found for current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Update Enquiry">
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!form.status || !form.message) {
              toast.error("Status and message are required");
              return;
            }
            await updateMutation.mutateAsync();
          }}
        >
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">AI Visual For This Enquiry</p>
            <div className="flex items-center gap-3">
              <img
                src={aiImageUrl}
                alt="AI enquiry"
                className="h-14 w-14 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                onError={(event) => {
                  event.currentTarget.src = "https://api.dicebear.com/9.x/shapes/png?seed=enquiry-modal-fallback";
                }}
              />
              <div className="flex-1 space-y-2">
                <Input value={aiImageUrl} onChange={(event) => setAiImageUrl(event.target.value)} placeholder="AI image URL" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAiImageUrl(generateEnquiryAiImage(`${form.status}-${form.message.slice(0, 20)}`))}
                >
                  <Bot size={14} className="mr-2" />
                  Regenerate AI Image
                </Button>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Status</p>
            <Select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="new">New</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Response Message</p>
            <Textarea
              rows={5}
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Type counselling follow-up response"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Update Enquiry"}
            </Button>
          </div>
        </form>
      </Modal>

      <p className="text-xs text-zinc-500">API coverage: GET /admin/enquiries, PUT /admin/enquiries/:id, DELETE /admin/enquiries/:id</p>
    </div>
  );
}
