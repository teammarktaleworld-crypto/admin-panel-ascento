"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Copy, ImageUp, Pencil, Plus, RefreshCcw, Search, Trash2, UserRound } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { domainsApi, teachersApi } from "@/lib/api";

type TeacherRow = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  domainId?: string | { _id?: string; name?: string };
  status?: "active" | "inactive";
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  qualification?: string;
  experienceYears?: number;
  joiningDate?: string;
  profilePhoto?: string;
};

type Option = {
  id: string;
  label: string;
};

type TeacherFormState = {
  name: string;
  email: string;
  phone: string;
  domainId: string;
  status: "active" | "inactive";
  address: string;
  city: string;
  state: string;
  country: string;
  dateOfBirth: string;
  gender: string;
  qualification: string;
  experienceYears: number;
  joiningDate: string;
  profilePhoto: string;
};

type CreatedTeacherCredentials = {
  name: string;
  email: string;
  temporaryPassword: string;
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
    .filter((option) => option.id.length > 0);
}

function defaultTeacherForm(): TeacherFormState {
  return {
    name: "",
    email: "",
    phone: "",
    domainId: "",
    status: "active",
    address: "",
    city: "",
    state: "",
    country: "India",
    dateOfBirth: "",
    gender: "male",
    qualification: "",
    experienceYears: 0,
    joiningDate: "",
    profilePhoto: "https://api.dicebear.com/9.x/personas/png?seed=teacher-default",
  };
}

function toIsoDate(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function toTeacherForm(row: TeacherRow): TeacherFormState {
  return {
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    domainId: row.domainId && typeof row.domainId === "object" ? String(row.domainId._id ?? "") : String(row.domainId ?? ""),
    status: row.status ?? "active",
    address: row.address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    country: row.country ?? "India",
    dateOfBirth: toIsoDate(row.dateOfBirth),
    gender: row.gender ?? "male",
    qualification: row.qualification ?? "",
    experienceYears: Number(row.experienceYears ?? 0),
    joiningDate: toIsoDate(row.joiningDate),
    profilePhoto: row.profilePhoto || "https://api.dicebear.com/9.x/personas/png?seed=teacher-default",
  };
}

function generateAiTeacherImage(name: string, gender: string) {
  const seed = `${name || "teacher"}-${gender || "person"}-${Date.now()}`;
  return `https://api.dicebear.com/9.x/personas/png?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to convert image file"));
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

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

function pickString(source: unknown, paths: string[]): string {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

export default function TeachersPage() {
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

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [form, setForm] = useState<TeacherFormState>(defaultTeacherForm());
  const [createdTeacherCredentials, setCreatedTeacherCredentials] = useState<CreatedTeacherCredentials | null>(null);
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teachersApi.list(),
  });
  const domainsQuery = useQuery({
    queryKey: ["domains", "teachers"],
    queryFn: () => domainsApi.list(),
  });

  const teacherRows = useMemo(() => toRows(listQuery.data) as TeacherRow[], [listQuery.data]);
  const domainOptions = useMemo(() => mapOptions(toRows(domainsQuery.data), "name"), [domainsQuery.data]);
  const domainLabelById = useMemo(() => {
    return domainOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [domainOptions]);

  const createMutation = useMutation({
    mutationFn: async () => teachersApi.create(form),
    onSuccess: async (response) => {
      const temporaryPassword = pickString(response, [
        "temporaryPassword",
        "tempPassword",
        "password",
        "credentials.temporaryPassword",
        "credentials.tempPassword",
        "credentials.password",
        "user.temporaryPassword",
        "user.tempPassword",
      ]);
      const name = pickString(response, ["name", "teacher.name", "user.name"]) || form.name;
      const email = pickString(response, ["email", "teacher.email", "user.email"]) || form.email;

      toast.success("Teacher created");
      closeModal();

      if (temporaryPassword) {
        setCreatedTeacherCredentials({
          name,
          email,
          temporaryPassword,
        });
      } else {
        toast.warning("Teacher created, but temporary password was not returned by API.");
      }

      await queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create teacher")),
  });

  const updateMutation = useMutation({
    mutationFn: async () => teachersApi.update(editingId, form),
    onSuccess: async () => {
      toast.success("Teacher updated");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update teacher")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => teachersApi.remove(id),
    onSuccess: async () => {
      toast.success("Teacher deleted");
      await queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete teacher")),
  });

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return teacherRows.filter((row) => {
      const rowDomainId = row.domainId && typeof row.domainId === "object" ? String(row.domainId._id ?? "") : String(row.domainId ?? "");
      const rowDomainName =
        row.domainId && typeof row.domainId === "object"
          ? String(row.domainId.name || row.domainId._id || "")
          : String(domainLabelById[rowDomainId] || row.domainId || "");

      const matchesStatus = statusFilter === "all" || String(row.status || "") === statusFilter;
      const matchesDomain = domainFilter === "all" || rowDomainId === domainFilter;
      const matchesSearch =
        !q ||
        String(row.name || "").toLowerCase().includes(q) ||
        String(row.email || "").toLowerCase().includes(q) ||
        String(row.phone || "").toLowerCase().includes(q) ||
        rowDomainName.toLowerCase().includes(q);

      return matchesStatus && matchesDomain && matchesSearch;
    });
  }, [domainFilter, domainLabelById, searchText, statusFilter, teacherRows]);

  const openCreateModal = () => {
    setEditingId("");
    setForm((prev) => ({ ...defaultTeacherForm(), domainId: domainFilter !== "all" ? domainFilter : prev.domainId }));
    setFormOpen(true);
  };

  const openEditModal = (row: TeacherRow) => {
    setEditingId(String(row._id ?? ""));
    setForm(toTeacherForm(row));
    setFormOpen(true);
  };

  const closeModal = () => {
    setFormOpen(false);
    setEditingId("");
    setForm(defaultTeacherForm());
  };

  const handleCopyTemporaryPassword = async () => {
    if (!createdTeacherCredentials?.temporaryPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdTeacherCredentials.temporaryPassword);
      toast.success("Temporary password copied");
    } catch {
      toast.error("Unable to copy password. Please copy it manually.");
    }
  };

  const handleDelete = (row: TeacherRow) => {
    if (!row._id) {
      return;
    }
    const ok = window.confirm(`Delete teacher ${row.name || "record"}?`);
    if (!ok) {
      return;
    }
    deleteMutation.mutate(String(row._id));
  };

  const handleGenerateAiImage = () => {
    const url = generateAiTeacherImage(form.name, form.gender);
    setForm((prev) => ({ ...prev, profilePhoto: url }));
    toast.success("AI teacher image generated");
  };

  const handleUploadProfileImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be under 2MB");
      event.target.value = "";
      return;
    }

    try {
      const url = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, profilePhoto: url }));
      toast.success("Profile image uploaded and converted to URL");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload image"));
    } finally {
      event.target.value = "";
    }
  };

  const isPageLoading = listQuery.isLoading || domainsQuery.isLoading;
  const isTableRefreshing = listQuery.isFetching && !isPageLoading;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-115 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
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
      <Card className="overflow-hidden border-0 bg-linear-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-lg">
        <div className="grid gap-4 p-1 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/85">Faculty Management</p>
            <h1 className="text-2xl font-semibold">Teachers</h1>
            <p className="text-sm text-white/90">Modern table view with quick popup create and update, reliable delete flow, and AI-style profile image support.</p>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <Bot size={14} />
              <span>AI generated profile image ready</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-emerald-300/35 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-white/60 bg-white/70">
                <img
                  src={form.profilePhoto}
                  alt="Teacher preview"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = "https://api.dicebear.com/9.x/personas/png?seed=teacher-fallback";
                  }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">AI Teacher Portrait</p>
                <p className="text-xs text-white/85">One click generates a unique profile image URL for each teacher.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-zinc-500">Total Teachers</p>
          <p className="mt-1 text-2xl font-semibold">{teacherRows.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Active Teachers</p>
          <p className="mt-1 text-2xl font-semibold">{teacherRows.filter((row) => row.status === "active").length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Domains Linked</p>
          <p className="mt-1 text-2xl font-semibold">{domainOptions.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Visible In Table</p>
          <p className="mt-1 text-2xl font-semibold">{filteredRows.length}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">Teachers List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => listQuery.refetch()}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateModal}>
              <Plus size={14} className="mr-2" />
              New Teacher
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search teacher by name, email, phone or domain"
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
                <th className="px-4 py-3 font-medium text-zinc-500">Teacher</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Domain</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Contact</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Experience</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const id = row._id || `teacher-${index}`;
                const domainId = row.domainId && typeof row.domainId === "object" ? String(row.domainId._id ?? "") : String(row.domainId ?? "");
                const domainLabel =
                  row.domainId && typeof row.domainId === "object"
                    ? String(row.domainId.name || row.domainId._id || "-")
                    : String(domainLabelById[domainId] || row.domainId || "-");
                const avatarUrl = row.profilePhoto || "https://api.dicebear.com/9.x/personas/png?seed=teacher-row";

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarUrl}
                          alt={row.name || "teacher"}
                          className="h-10 w-10 rounded-full border border-zinc-200 object-cover dark:border-zinc-800"
                          onError={(event) => {
                            event.currentTarget.src = "https://api.dicebear.com/9.x/personas/png?seed=teacher-row-fallback";
                          }}
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.name || "-"}</p>
                          <p className="text-xs text-zinc-500">{row.email || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{domainLabel}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.phone || "-"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{Number(row.experienceYears ?? 0)} years</td>
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
                        <Button size="sm" variant="outline" onClick={() => openEditModal(row)}>
                          <Pencil size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(row)}
                          disabled={deleteMutation.isPending}
                        >
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
                    No teachers found for current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeModal}
        title={editingId ? "Update Teacher" : "Create Teacher"}
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();

            if (!form.name || !form.email || !form.phone || !form.domainId || !form.address || !form.city || !form.state || !form.country) {
              toast.error("Please fill all required fields");
              return;
            }

            if (!form.profilePhoto.startsWith("http") && !form.profilePhoto.startsWith("data:image/")) {
              toast.error("Profile image must be a valid URL or uploaded image");
              return;
            }

            if (editingId) {
              await updateMutation.mutateAsync();
              return;
            }

            await createMutation.mutateAsync();
          }}
        >
          <div className="sm:col-span-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">AI Profile Image</p>
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={form.profilePhoto}
                alt="Teacher avatar"
                className="h-14 w-14 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
                onError={(event) => {
                  event.currentTarget.src = "https://api.dicebear.com/9.x/personas/png?seed=teacher-avatar-fallback";
                }}
              />
              <div className="flex-1 space-y-2">
                <Input
                  value={form.profilePhoto}
                  onChange={(event) => setForm((prev) => ({ ...prev, profilePhoto: event.target.value }))}
                  placeholder="https://..."
                />
                <Button type="button" variant="outline" onClick={handleGenerateAiImage}>
                  <Bot size={14} className="mr-2" />
                  Generate AI Image
                </Button>
                <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
                  <ImageUp size={14} className="mr-2" />
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadProfileImage} />
                </label>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Name</p>
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Email</p>
            <Input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Phone</p>
            <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} required />
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
          <div>
            <p className="mb-1 text-xs text-zinc-500">Gender</p>
            <Select value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Qualification</p>
            <Input
              value={form.qualification}
              onChange={(event) => setForm((prev) => ({ ...prev, qualification: event.target.value }))}
              required
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Experience (Years)</p>
            <Input
              type="number"
              min={0}
              value={form.experienceYears}
              onChange={(event) => setForm((prev) => ({ ...prev, experienceYears: Number(event.target.value || 0) }))}
              required
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-500">Date of Birth</p>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              required
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Joining Date</p>
            <Input
              type="date"
              value={form.joiningDate}
              onChange={(event) => setForm((prev) => ({ ...prev, joiningDate: event.target.value }))}
              required
            />
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
            <p className="mb-1 text-xs text-zinc-500">Country</p>
            <Input value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} required />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Update Teacher" : "Create Teacher"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(createdTeacherCredentials)}
        onClose={() => setCreatedTeacherCredentials(null)}
        title="Teacher Temporary Password"
      >
        {createdTeacherCredentials ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Share this password with <span className="font-medium">{createdTeacherCredentials.name || "the teacher"}</span> for first login.
              This is shown only once.
            </p>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Email</p>
              <p className="mt-1 break-all text-sm font-medium text-zinc-900 dark:text-zinc-100">{createdTeacherCredentials.email}</p>

              <p className="mt-3 text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Temporary Password</p>
              <p className="mt-1 break-all rounded border border-amber-300 bg-white px-2 py-2 font-mono text-sm font-semibold text-zinc-900 dark:border-amber-700 dark:bg-zinc-950 dark:text-zinc-100">
                {createdTeacherCredentials.temporaryPassword}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCopyTemporaryPassword}>
                <Copy size={14} className="mr-2" />
                Copy Password
              </Button>
              <Button type="button" onClick={() => setCreatedTeacherCredentials(null)}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  );
}
