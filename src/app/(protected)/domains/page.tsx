"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, ListChecks, Pencil, Plus, Search, Shapes, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

import { Modal } from "@/components/app/modal";
import { DomainForm } from "@/components/forms/domain-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { domainsApi } from "@/lib/api";
import type { Domain } from "@/types/api";

export default function DomainsPage() {
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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["domains"],
    queryFn: domainsApi.list,
  });

  const byIdQuery = useQuery({
    queryKey: ["domain", selectedDomainId],
    queryFn: () => domainsApi.getById(selectedDomainId),
    enabled: selectedDomainId.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: domainsApi.create,
    onSuccess: async () => {
      toast.success("Domain created");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Domain create failed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof domainsApi.update>[1] }) =>
      domainsApi.update(id, payload),
    onSuccess: async () => {
      toast.success("Domain updated");
      setOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Domain update failed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: domainsApi.remove,
    onSuccess: async () => {
      toast.success("Domain deleted");
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Domain delete failed"));
    },
  });

  const domains = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const activeCount = domains.filter((domain) => domain.status === "active").length;
  const inactiveCount = domains.filter((domain) => domain.status === "inactive").length;
  const filteredDomains = useMemo(() => {
    const searchText = tableSearch.trim().toLowerCase();

    return domains.filter((domain) => {
      const matchesSearch =
        !searchText ||
        domain.name.toLowerCase().includes(searchText) ||
        domain.code.toLowerCase().includes(searchText) ||
        String(domain.description || "").toLowerCase().includes(searchText);

      const matchesStatus = statusFilter === "all" || domain.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [domains, statusFilter, tableSearch]);
  const selectedDomainEndpoint = selectedDomainId
    ? `/admin/domains/${selectedDomainId}`
    : "/admin/domains/{domainId}";

  if (listQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Curriculum Setup</p>
            <h1 className="text-2xl font-semibold">Domains Management</h1>
            <p className="text-sm text-zinc-500">Use this section to create streams, update their status, and verify domain details.</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1" />
            New Domain
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Total Domains</p>
            <p className="text-2xl font-semibold">{domains.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Active</p>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Inactive</p>
            <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{inactiveCount}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Domains Table</h2>
          <p className="text-sm text-zinc-500">Create, edit, and delete available domain streams.</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Domains List</h3>
            <p className="text-sm text-zinc-500">Clear table view with quick search and status filtering.</p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                placeholder="Search name, code, description"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full sm:w-36">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Code</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Description</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDomains.map((domain) => (
                <tr key={domain._id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{domain.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{domain.code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        domain.status === "active"
                          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }
                    >
                      {domain.status}
                    </span>
                  </td>
                  <td className="max-w-[320px] px-4 py-3 text-zinc-600 dark:text-zinc-300">{domain.description || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(domain);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={14} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (domain._id) {
                            deleteMutation.mutate(domain._id);
                          }
                        }}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredDomains.length ? (
          <p className="mt-3 text-sm text-zinc-500">No domains match your current search/filter.</p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2">
            <ListChecks size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold">Get Domain From List</h2>
          </div>
          <p className="mb-2 text-sm text-zinc-500">Pick a domain from fetched list and load by ID.</p>
          <div className="mb-2 flex gap-2">
            <Select value={selectedDomainId} onChange={(event) => setSelectedDomainId(event.target.value)}>
              <option value="">Select Domain</option>
              {(listQuery.data ?? []).map((domain) => (
                <option key={domain._id} value={domain._id}>
                  {domain.name} ({domain.code})
                </option>
              ))}
            </Select>
            <Button variant="outline" onClick={() => byIdQuery.refetch()} disabled={!selectedDomainId}>
              Fetch
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2">
            <Eye size={18} className="text-violet-600" />
            <h2 className="text-lg font-semibold">Selected Domain Details</h2>
          </div>
          <p className="mb-2 text-sm text-zinc-500">GET {selectedDomainEndpoint}</p>
          {byIdQuery.isFetching ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : byIdQuery.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">Unable to fetch selected domain details.</p>
          ) : byIdQuery.data ? (
            <div className="grid gap-2 text-sm">
              <p className="text-zinc-500">API response loaded successfully.</p>
              <p>Name: {byIdQuery.data.name || "-"}</p>
              <p>Code: {byIdQuery.data.code || "-"}</p>
              <p>Status: {byIdQuery.data.status || "-"}</p>
              <p>Description: {byIdQuery.data.description || "-"}</p>
              <p>ID: {byIdQuery.data._id || "-"}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No domain selected.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        <div className="mb-2 flex items-center gap-2">
          <Shapes size={16} />
          <p className="font-medium">What this section shows</p>
        </div>
        <p>1. Domains Table: full list of stream records with quick edit and delete actions.</p>
        <p>2. Get Domain From List: fetch exact record details by selecting an item.</p>
        <p>3. Selected Domain Details: clear view of values returned from API for selected domain.</p>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit Domain" : "Create Domain"}>
        <DomainForm
          initial={editing ?? undefined}
          onSubmit={async (payload) => {
            try {
              if (editing?._id) {
                await updateMutation.mutateAsync({ id: editing._id, payload });
                return;
              }
              await createMutation.mutateAsync(payload);
            } catch {
              // mutation onError already handles user-facing feedback
            }
          }}
        />
      </Modal>
    </div>
  );
}
