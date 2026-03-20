"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCcw, Search, Trash2, Users } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { domainsApi, studentsApi } from "@/lib/api";

type StudentRow = {
  _id?: string;
  fullName?: string;
  dob?: string;
  age?: number;
  gender?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  domainId?: string | { _id?: string; name?: string };
  status?: "active" | "inactive";
  address?: string;
  city?: string;
  state?: string;
  bloodGroup?: string;
};

type Option = {
  id: string;
  label: string;
};

type StudentFormState = {
  fullName: string;
  dob: string;
  age: number;
  gender: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  domainId: string;
  password: string;
  status: "active" | "inactive";
  address: string;
  city: string;
  state: string;
  bloodGroup: string;
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

function mapOptions(rows: Array<Record<string, unknown>>, labelKeys: string[]): Option[] {
  return rows
    .map((row) => {
      const id = String(row._id ?? row.id ?? "");
      const label = labelKeys.map((key) => String(row[key] ?? "").trim()).find((value) => value.length > 0) ?? id;
      return { id, label };
    })
    .filter((option) => option.id.length > 0);
}

function defaultForm(): StudentFormState {
  return {
    fullName: "",
    dob: "",
    age: 12,
    gender: "male",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    domainId: "",
    password: "Student@123",
    status: "active",
    address: "",
    city: "",
    state: "",
    bloodGroup: "O+",
  };
}

function toDateOnly(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function toForm(row: StudentRow): StudentFormState {
  return {
    fullName: row.fullName ?? "",
    dob: toDateOnly(row.dob),
    age: Number(row.age ?? 12),
    gender: row.gender ?? "male",
    parentName: row.parentName ?? "",
    parentPhone: row.parentPhone ?? "",
    parentEmail: row.parentEmail ?? "",
    domainId: row.domainId && typeof row.domainId === "object" ? String(row.domainId._id ?? "") : String(row.domainId ?? ""),
    password: "",
    status: row.status ?? "active",
    address: row.address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    bloodGroup: row.bloodGroup ?? "O+",
  };
}

export default function StudentsPage() {
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
  const [editingId, setEditingId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [form, setForm] = useState<StudentFormState>(defaultForm());

  const studentsQuery = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
  });
  const domainsQuery = useQuery({
    queryKey: ["domains", "students"],
    queryFn: () => domainsApi.list(),
  });

  const studentRows = useMemo(() => toRows(studentsQuery.data) as StudentRow[], [studentsQuery.data]);
  const domainOptions = useMemo(() => mapOptions(toRows(domainsQuery.data), ["name"]), [domainsQuery.data]);
  const domainLabelById = useMemo(() => {
    return domainOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [domainOptions]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return studentRows.filter((row) => {
      const rowDomainId = row.domainId && typeof row.domainId === "object" ? String(row.domainId._id ?? "") : String(row.domainId ?? "");
      const rowDomainName =
        row.domainId && typeof row.domainId === "object"
          ? String(row.domainId.name || row.domainId._id || "")
          : String(domainLabelById[rowDomainId] || row.domainId || "");

      const matchesStatus = statusFilter === "all" || String(row.status || "") === statusFilter;
      const matchesDomain = domainFilter === "all" || rowDomainId === domainFilter;
      const matchesSearch =
        !q ||
        String(row.fullName || "").toLowerCase().includes(q) ||
        String(row.parentName || "").toLowerCase().includes(q) ||
        String(row.parentEmail || "").toLowerCase().includes(q) ||
        String(row.parentPhone || "").toLowerCase().includes(q) ||
        rowDomainName.toLowerCase().includes(q);

      return matchesStatus && matchesDomain && matchesSearch;
    });
  }, [domainFilter, domainLabelById, searchText, statusFilter, studentRows]);

  const createMutation = useMutation({
    mutationFn: async () => studentsApi.create(form),
    onSuccess: async () => {
      toast.success("Student created");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create student")),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { password, ...updatePayload } = form;
      void password;
      return studentsApi.update(editingId, updatePayload);
    },
    onSuccess: async () => {
      toast.success("Student updated");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update student")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => studentsApi.remove(id),
    onSuccess: async () => {
      toast.success("Student deleted");
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete student")),
  });

  const openCreate = () => {
    setEditingId("");
    setForm((prev) => ({ ...defaultForm(), domainId: domainFilter !== "all" ? domainFilter : prev.domainId }));
    setOpen(true);
  };

  const openEdit = (row: StudentRow) => {
    setEditingId(String(row._id ?? ""));
    setForm(toForm(row));
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId("");
    setForm(defaultForm());
  };

  const handleDelete = (row: StudentRow) => {
    if (!row._id) {
      return;
    }
    const ok = window.confirm(`Delete student ${row.fullName || "record"}?`);
    if (!ok) {
      return;
    }
    deleteMutation.mutate(String(row._id));
  };

  const isPageLoading = studentsQuery.isLoading || domainsQuery.isLoading;
  const isTableRefreshing = studentsQuery.isFetching && !isPageLoading;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Skeleton className="h-10 w-full md:col-span-2" />
            <Skeleton className="h-10 w-full" />
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
      <Card className="overflow-hidden border-0 bg-linear-to-r from-sky-600 via-cyan-500 to-blue-500 text-white shadow-lg">
        <div className="space-y-1 p-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/85">Student Management</p>
          <h1 className="text-2xl font-semibold">Students</h1>
          <p className="text-sm text-white/90">Better table view, popup create-update, and stable delete flow with real API data.</p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-zinc-500">Total Students</p>
          <p className="mt-1 text-2xl font-semibold">{studentRows.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Active Students</p>
          <p className="mt-1 text-2xl font-semibold">{studentRows.filter((row) => row.status === "active").length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Domains Linked</p>
          <p className="mt-1 text-2xl font-semibold">{domainOptions.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Visible Rows</p>
          <p className="mt-1 text-2xl font-semibold">{filteredRows.length}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-sky-600" />
            <h2 className="text-lg font-semibold">Students List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => studentsQuery.refetch()}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus size={14} className="mr-2" />
              New Student
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search student, parent name/email/phone"
              className="pl-9"
            />
          </div>

          <Select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)}>
            <option value="all">All Domains</option>
            {domainOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>

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
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : null}

        <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-500">Student</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Parent</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Domain</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const id = row._id || `student-${index}`;
                const domainId = row.domainId && typeof row.domainId === "object" ? String(row.domainId._id ?? "") : String(row.domainId ?? "");
                const domainLabel =
                  row.domainId && typeof row.domainId === "object"
                    ? String(row.domainId.name || row.domainId._id || "-")
                    : String(domainLabelById[domainId] || row.domainId || "-");

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.fullName || "-"}</p>
                      <p className="text-xs text-zinc-500">{row.gender || "-"}, {Number(row.age ?? 0)} yrs</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-700 dark:text-zinc-200">{row.parentName || "-"}</p>
                      <p className="text-xs text-zinc-500">{row.parentEmail || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{domainLabel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          row.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {row.status || "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                          <Pencil size={14} className="mr-1" />
                          Edit
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
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    No students found for current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={closeModal} title={editingId ? "Update Student" : "Create Student"}>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();

            if (!form.fullName || !form.parentName || !form.parentPhone || !form.parentEmail || !form.domainId || !form.address || !form.city || !form.state) {
              toast.error("Please fill all required fields");
              return;
            }

            if (!editingId && !form.password) {
              toast.error("Password is required for new student");
              return;
            }

            if (editingId) {
              await updateMutation.mutateAsync();
              return;
            }

            await createMutation.mutateAsync();
          }}
        >
          <div>
            <p className="mb-1 text-xs text-zinc-500">Full Name</p>
            <Input value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} required />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">DOB</p>
            <Input type="date" value={form.dob} onChange={(event) => setForm((prev) => ({ ...prev, dob: event.target.value }))} required />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Age</p>
            <Input type="number" min={1} value={form.age} onChange={(event) => setForm((prev) => ({ ...prev, age: Number(event.target.value || 1) }))} required />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Gender</p>
            <Select value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Parent Name</p>
            <Input value={form.parentName} onChange={(event) => setForm((prev) => ({ ...prev, parentName: event.target.value }))} required />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Parent Phone</p>
            <Input value={form.parentPhone} onChange={(event) => setForm((prev) => ({ ...prev, parentPhone: event.target.value }))} required />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Parent Email</p>
            <Input type="email" value={form.parentEmail} onChange={(event) => setForm((prev) => ({ ...prev, parentEmail: event.target.value }))} required />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Domain</p>
            <Select value={form.domainId} onChange={(event) => setForm((prev) => ({ ...prev, domainId: event.target.value }))} required>
              <option value="">Select domain</option>
              {domainOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {!editingId ? (
            <div>
              <p className="mb-1 text-xs text-zinc-500">Password</p>
              <Input value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required />
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs text-zinc-500">Status</p>
            <Select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1 text-xs text-zinc-500">Address</p>
            <Input value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} required />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">City</p>
            <Input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} required />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">State</p>
            <Input value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} required />
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1 text-xs text-zinc-500">Blood Group</p>
            <Input value={form.bloodGroup} onChange={(event) => setForm((prev) => ({ ...prev, bloodGroup: event.target.value }))} required />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Update Student" : "Create Student"}
            </Button>
          </div>
        </form>
      </Modal>

      <p className="text-xs text-zinc-500">API coverage: GET /admin/students, POST /admin/students, PUT /admin/students/:id, DELETE /admin/students/:id</p>
    </div>
  );
}
