"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanknoteArrowUp, IndianRupee, PencilLine, Plus, RefreshCcw, Search } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import { Modal } from "@/components/app/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { classesApi, feesApi, studentsApi, yearsApi } from "@/lib/api";

type SelectOption = {
  id: string;
  label: string;
};

type FeeRow = {
  _id?: string;
  studentId?: string | { _id?: string; fullName?: string; name?: string };
  classId?: string | { _id?: string; name?: string };
  academicYearId?: string | { _id?: string; name?: string };
  feeType?: string;
  amount?: number;
  dueDate?: string;
  paymentStatus?: string;
};

type CreateFeeForm = {
  studentId: string;
  classId: string;
  academicYearId: string;
  feeType: string;
  amount: string;
  dueDate: string;
  paymentStatus: string;
};

type PayFeeForm = {
  feeId: string;
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;
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
      const label = labelKeys.map((key) => String(row[key] ?? "").trim()).find((value) => value.length > 0) ?? id;
      return { id, label };
    })
    .filter((entry) => entry.id.length > 0);
}

function defaultCreateForm(): CreateFeeForm {
  return {
    studentId: "",
    classId: "",
    academicYearId: "",
    feeType: "tuition",
    amount: "15000",
    dueDate: "2026-06-30",
    paymentStatus: "pending",
  };
}

function defaultPayForm(): PayFeeForm {
  return {
    feeId: "",
    paymentMethod: "upi",
    transactionReference: "",
    paymentDate: new Date().toISOString().slice(0, 10),
  };
}

export default function FeesPage() {
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
  const [studentFilter, setStudentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFeeForm>(defaultCreateForm());
  const [payForm, setPayForm] = useState<PayFeeForm>(defaultPayForm());

  const studentsQuery = useQuery({ queryKey: ["students", "fees"], queryFn: () => studentsApi.list() });
  const classesQuery = useQuery({ queryKey: ["classes", "fees"], queryFn: () => classesApi.list() });
  const yearsQuery = useQuery({ queryKey: ["years", "fees"], queryFn: () => yearsApi.list() });

  const feesQuery = useQuery({
    queryKey: ["fees", studentFilter, yearFilter],
    queryFn: () =>
      feesApi.list({
        ...(studentFilter ? { studentId: studentFilter } : {}),
        ...(yearFilter ? { academicYearId: yearFilter } : {}),
      }),
  });

  const studentOptions = useMemo(() => mapOptions(toRows(studentsQuery.data), ["fullName", "name", "email"]), [studentsQuery.data]);
  const classOptions = useMemo(() => mapOptions(toRows(classesQuery.data), ["name"]), [classesQuery.data]);
  const yearOptions = useMemo(() => mapOptions(toRows(yearsQuery.data), ["name"]), [yearsQuery.data]);

  const studentLabelById = useMemo(() => {
    return studentOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.id] = option.label;
      return acc;
    }, {});
  }, [studentOptions]);

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

  const feeRows = useMemo(() => toRows(feesQuery.data) as FeeRow[], [feesQuery.data]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return feeRows.filter((row) => {
      const studentId = row.studentId && typeof row.studentId === "object" ? String(row.studentId._id ?? "") : String(row.studentId ?? "");
      const studentLabel =
        row.studentId && typeof row.studentId === "object"
          ? String(row.studentId.fullName || row.studentId.name || row.studentId._id || "")
          : String(studentLabelById[studentId] || row.studentId || "");

      const yearId = row.academicYearId && typeof row.academicYearId === "object" ? String(row.academicYearId._id ?? "") : String(row.academicYearId ?? "");
      const yearLabel =
        row.academicYearId && typeof row.academicYearId === "object"
          ? String(row.academicYearId.name || row.academicYearId._id || "")
          : String(yearLabelById[yearId] || row.academicYearId || "");

      const classId = row.classId && typeof row.classId === "object" ? String(row.classId._id ?? "") : String(row.classId ?? "");
      const classLabel =
        row.classId && typeof row.classId === "object"
          ? String(row.classId.name || row.classId._id || "")
          : String(classLabelById[classId] || row.classId || "");

      const matchesStatus = statusFilter === "all" || String(row.paymentStatus || "") === statusFilter;
      const matchesSearch =
        !q ||
        String(row.feeType || "").toLowerCase().includes(q) ||
        studentLabel.toLowerCase().includes(q) ||
        yearLabel.toLowerCase().includes(q) ||
        classLabel.toLowerCase().includes(q) ||
        String(row._id || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [classLabelById, feeRows, searchText, statusFilter, studentLabelById, yearLabelById]);

  const createMutation = useMutation({
    mutationFn: async () =>
      feesApi.create({
        studentId: createForm.studentId,
        classId: createForm.classId,
        academicYearId: createForm.academicYearId,
        feeType: createForm.feeType,
        amount: Number(createForm.amount),
        dueDate: createForm.dueDate,
        paymentStatus: createForm.paymentStatus,
      }),
    onSuccess: async () => {
      toast.success("Fee created");
      setCreateOpen(false);
      setCreateForm(defaultCreateForm());
      await queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create fee")),
  });

  const payMutation = useMutation({
    mutationFn: async () => feesApi.pay(payForm),
    onSuccess: async () => {
      toast.success("Fee payment updated");
      setPayOpen(false);
      setPayForm(defaultPayForm());
      await queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update payment")),
  });

  const isPageLoading = studentsQuery.isLoading || classesQuery.isLoading || yearsQuery.isLoading || feesQuery.isLoading;
  const isTableRefreshing = feesQuery.isFetching && !isPageLoading;

  if (isPageLoading) {
    return (
      <div className="space-y-5">
        <Card className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
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
      <Card className="overflow-hidden border-0 bg-linear-to-r from-blue-600 via-cyan-500 to-emerald-500 text-white shadow-lg">
        <div className="space-y-1 p-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">Finance Module</p>
          <h1 className="text-2xl font-semibold">Fees Management</h1>
          <p className="text-sm text-white/85">Create fees, track status, and update payment in popup flows with real API calls.</p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-zinc-500">Total Fees</p>
          <p className="mt-1 text-2xl font-semibold">{feeRows.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Pending</p>
          <p className="mt-1 text-2xl font-semibold">{feeRows.filter((row) => row.paymentStatus === "pending").length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Paid</p>
          <p className="mt-1 text-2xl font-semibold">{feeRows.filter((row) => row.paymentStatus === "paid").length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Visible Rows</p>
          <p className="mt-1 text-2xl font-semibold">{filteredRows.length}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IndianRupee size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">Fees Ledger</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => feesQuery.refetch()}>
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setPayOpen(true)}>
              <PencilLine size={14} className="mr-2" />
              Record Payment
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-2" />
              Create Fee
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by fee type, student, class, year, fee id"
              className="pl-9"
            />
          </div>

          <Select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
            <option value="">All Students</option>
            {studentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <Select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
              <option value="">All Years</option>
              {yearOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </Select>
          </div>
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
                <th className="px-3 py-3 font-medium text-zinc-500">Fee</th>
                <th className="px-3 py-3 font-medium text-zinc-500">Student</th>
                <th className="px-3 py-3 font-medium text-zinc-500">Class/Year</th>
                <th className="px-3 py-3 font-medium text-zinc-500">Amount</th>
                <th className="px-3 py-3 font-medium text-zinc-500">Due Date</th>
                <th className="px-3 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-3 py-3 text-right font-medium text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const id = row._id || `row-${index}`;

                const studentId = row.studentId && typeof row.studentId === "object" ? String(row.studentId._id ?? "") : String(row.studentId ?? "");
                const studentLabel =
                  row.studentId && typeof row.studentId === "object"
                    ? String(row.studentId.fullName || row.studentId.name || row.studentId._id || "-")
                    : String(studentLabelById[studentId] || row.studentId || "-");

                const classId = row.classId && typeof row.classId === "object" ? String(row.classId._id ?? "") : String(row.classId ?? "");
                const classLabel =
                  row.classId && typeof row.classId === "object"
                    ? String(row.classId.name || row.classId._id || "-")
                    : String(classLabelById[classId] || row.classId || "-");

                const yearId = row.academicYearId && typeof row.academicYearId === "object" ? String(row.academicYearId._id ?? "") : String(row.academicYearId ?? "");
                const yearLabel =
                  row.academicYearId && typeof row.academicYearId === "object"
                    ? String(row.academicYearId.name || row.academicYearId._id || "-")
                    : String(yearLabelById[yearId] || row.academicYearId || "-");

                return (
                  <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-3 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.feeType || "-"}</p>
                      <p className="text-xs text-zinc-500">{row._id || "-"}</p>
                    </td>
                    <td className="px-3 py-3 text-zinc-700 dark:text-zinc-200">{studentLabel}</td>
                    <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                      <p>{classLabel}</p>
                      <p className="text-xs text-zinc-500">{yearLabel}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <IndianRupee size={12} />
                        {Number(row.amount ?? 0)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{String(row.dueDate || "").slice(0, 10) || "-"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          row.paymentStatus === "paid"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : row.paymentStatus === "partial"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {row.paymentStatus || "pending"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPayForm((prev) => ({
                            ...prev,
                            feeId: String(row._id ?? ""),
                            transactionReference: prev.transactionReference || `TXN-${String(row._id ?? "").slice(-6)}`,
                          }));
                          setPayOpen(true);
                        }}
                      >
                        <BanknoteArrowUp size={14} className="mr-1" />
                        Pay
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                    No fees found for current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Fee">
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!createForm.studentId || !createForm.classId || !createForm.academicYearId || !createForm.feeType || !createForm.amount || !createForm.dueDate) {
              toast.error("Please fill all required fields");
              return;
            }
            await createMutation.mutateAsync();
          }}
        >
          <Select value={createForm.studentId} onChange={(event) => setCreateForm((prev) => ({ ...prev, studentId: event.target.value }))}>
            <option value="">Select Student</option>
            {studentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select value={createForm.classId} onChange={(event) => setCreateForm((prev) => ({ ...prev, classId: event.target.value }))}>
            <option value="">Select Class</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={createForm.academicYearId}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, academicYearId: event.target.value }))}
          >
            <option value="">Select Academic Year</option>
            {yearOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={createForm.feeType} onChange={(event) => setCreateForm((prev) => ({ ...prev, feeType: event.target.value }))} placeholder="Fee Type" />
            <Input type="number" value={createForm.amount} onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Amount" />
            <Input type="date" value={createForm.dueDate} onChange={(event) => setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
            <Select
              value={createForm.paymentStatus}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, paymentStatus: event.target.value }))}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Fee"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment">
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!payForm.feeId || !payForm.paymentMethod || !payForm.paymentDate || !payForm.transactionReference) {
              toast.error("Please fill all payment fields");
              return;
            }
            await payMutation.mutateAsync();
          }}
        >
          <Input value={payForm.feeId} onChange={(event) => setPayForm((prev) => ({ ...prev, feeId: event.target.value }))} placeholder="Fee ID" />

          <Select value={payForm.paymentMethod} onChange={(event) => setPayForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="netbanking">Net Banking</option>
          </Select>

          <Input
            value={payForm.transactionReference}
            onChange={(event) => setPayForm((prev) => ({ ...prev, transactionReference: event.target.value }))}
            placeholder="Transaction Reference"
          />

          <Input type="date" value={payForm.paymentDate} onChange={(event) => setPayForm((prev) => ({ ...prev, paymentDate: event.target.value }))} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPayOpen(false)} disabled={payMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={payMutation.isPending}>
              {payMutation.isPending ? "Submitting..." : "Submit Payment"}
            </Button>
          </div>
        </form>
      </Modal>

      <p className="text-xs text-zinc-500">API coverage: GET /admin/fees, POST /admin/fees, PUT /admin/fees/pay</p>
    </div>
  );
}
