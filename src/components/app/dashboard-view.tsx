"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarClock,
  GraduationCap,
  IdCard,
  IndianRupee,
  Mail,
  Megaphone,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi, dashboardApi } from "@/lib/api";

const feeChartColors = ["#16a34a", "#dc2626"];
const academicChartColors = ["#2563eb", "#0ea5e9", "#16a34a", "#f59e0b"];

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function noticeStatusTone(status?: string) {
  const value = String(status || "active").toLowerCase();
  if (value === "draft") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300";
  }
  if (value === "inactive" || value === "archived") {
    return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300";
}

export function DashboardView() {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: authApi.profile,
  });

  const statsQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  if (statsQuery.isLoading || profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (statsQuery.isError || profileQuery.isError) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">Unable to load dashboard data</p>
        <p className="mt-1 text-sm text-red-600/90 dark:text-red-300/90">
          Please refresh the page. If the issue continues, verify admin session and API connectivity.
        </p>
      </Card>
    );
  }

  const profile = profileQuery.data;
  const stats = statsQuery.data || {};
  const totalStudents = Number(stats.totalStudents || 0);
  const totalTeachers = Number(stats.totalTeachers || 0);
  const totalClasses = Number(stats.totalClasses || 0);
  const totalSubjects = Number(stats.totalSubjects || 0);
  const newStudentsToday = Number(stats.newStudentsToday || 0);
  const newTeachersToday = Number(stats.newTeachersToday || 0);
  const attendanceTodayPercentage = Number(stats.attendanceTodayPercentage || 0);
  const feesCollectedThisMonth = Number(stats.feesCollectedThisMonth || 0);
  const pendingFees = Number(stats.pendingFees || 0);
  const pendingEnquiries = Number(stats.pendingEnquiries || 0);

  const cards = [
    {
      label: "Total Students",
      value: compactNumber.format(totalStudents),
      hint: `+${newStudentsToday} new today`,
      icon: GraduationCap,
      color: "from-blue-500/15 to-sky-500/10 text-blue-700 dark:text-blue-300",
    },
    {
      label: "Total Teachers",
      value: compactNumber.format(totalTeachers),
      hint: `+${newTeachersToday} new today`,
      icon: Users,
      color: "from-emerald-500/15 to-green-500/10 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Attendance Today",
      value: `${attendanceTodayPercentage}%`,
      hint: "Current day attendance",
      icon: Activity,
      color: "from-amber-500/15 to-yellow-500/10 text-amber-700 dark:text-amber-300",
    },
    {
      label: "Pending Fees",
      value: inr.format(pendingFees),
      hint: "Outstanding amount",
      icon: IndianRupee,
      color: "from-rose-500/15 to-red-500/10 text-rose-700 dark:text-rose-300",
    },
  ];

  const academicComposition = [
    { label: "Classes", value: totalClasses },
    { label: "Subjects", value: totalSubjects },
    { label: "Teachers", value: totalTeachers },
    { label: "Students", value: totalStudents },
  ];

  const feeSplit = [
    { name: "Collected", value: feesCollectedThisMonth },
    { name: "Pending", value: pendingFees },
  ];
  const totalFeeFlow = feesCollectedThisMonth + pendingFees;
  const collectionRate = totalFeeFlow > 0 ? Math.round((feesCollectedThisMonth / totalFeeFlow) * 100) : 0;

  const activitySnapshot = [
    { name: "New Students", value: newStudentsToday },
    { name: "New Teachers", value: newTeachersToday },
    { name: "Enquiries", value: pendingEnquiries },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500">Live analytics, charts, and key operations overview</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Live API Data</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="animate-rise-in overflow-hidden p-0">
            <div className={`bg-linear-to-br p-4 ${card.color}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.15em]">{card.label}</p>
                <card.icon size={18} />
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{card.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-3 border-zinc-300 bg-zinc-50/70 xl:col-span-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Academic Composition</h2>
              <p className="text-xs text-zinc-500">Distribution of school structure and people</p>
            </div>
            <div className="rounded-md border border-zinc-300 bg-white p-1.5 dark:border-zinc-700 dark:bg-zinc-950">
              <School size={16} className="text-zinc-500" />
            </div>
          </div>

          <div className="h-72 w-full rounded-xl border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950/70">
            <ResponsiveContainer>
              <BarChart data={academicComposition} layout="vertical" margin={{ top: 12, right: 30, bottom: 8, left: 18 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#d4d4d8" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#71717a" }} />
                <YAxis dataKey="label" type="category" width={88} tick={{ fontSize: 12, fill: "#3f3f46" }} />
                <Tooltip
                  cursor={{ fill: "rgba(161,161,170,0.12)" }}
                  formatter={(value) => compactNumber.format(Number(value || 0))}
                  contentStyle={{ borderRadius: 10, borderColor: "#d4d4d8", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
                  {academicComposition.map((item, index) => (
                    <Cell key={item.label} fill={academicChartColors[index % academicChartColors.length]} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(value: number) => compactNumber.format(Number(value || 0))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-3 border-zinc-300 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Fees Status</h2>
              <p className="text-xs text-zinc-500">Collection vs pending balance</p>
            </div>
            <div className="rounded-md border border-zinc-300 bg-white p-1.5 dark:border-zinc-700 dark:bg-zinc-950">
              <IndianRupee size={16} className="text-zinc-500" />
            </div>
          </div>

          <div className="relative h-72 w-full rounded-xl border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950/70">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={feeSplit} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} startAngle={90} endAngle={-270}>
                  {feeSplit.map((entry, index) => (
                    <Cell key={entry.name} fill={feeChartColors[index % feeChartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const amount = typeof value === "number" ? value : Number(value || 0);
                    return inr.format(Number.isFinite(amount) ? amount : 0);
                  }}
                  contentStyle={{ borderRadius: 10, borderColor: "#d4d4d8", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-950/95">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Collection</p>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{collectionRate}%</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {feeSplit.map((entry, index) => {
              const amount = Number(entry.value || 0);
              const percent = totalFeeFlow > 0 ? Math.round((amount / totalFeeFlow) * 100) : 0;
              return (
                <div key={entry.name} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950/60">
                  <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: feeChartColors[index % feeChartColors.length] }} />
                    {entry.name}
                  </span>
                  <span className="text-right">
                    <span className="block font-medium text-zinc-900 dark:text-zinc-100">{inr.format(amount)}</span>
                    <span className="text-xs text-zinc-500">{percent}%</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="bg-linear-to-r from-sky-600 via-cyan-500 to-teal-500 p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/80">Session Identity</p>
                <h2 className="mt-1 text-lg font-semibold">Admin Profile</h2>
              </div>
              <div className="rounded-lg border border-white/35 bg-white/15 p-2 backdrop-blur-sm">
                <Image src="/logo.png" alt="Ascento" width={96} height={30} className="h-auto w-auto" />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <p className="text-sm text-zinc-500">Profile data from /admin/profile with role and account activity details.</p>

            <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Name</p>
                <p className="mt-1 text-sm font-medium">{profile?.name || "-"}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500"><Mail size={12} /> Email</p>
                <p className="mt-1 break-all text-sm font-medium">{profile?.email || "-"}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500"><ShieldCheck size={12} /> Role</p>
                <p className="mt-1 text-sm font-medium capitalize">{profile?.role || "-"}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500"><IdCard size={12} /> Admin ID</p>
                <p className="mt-1 break-all text-sm font-medium">{profile?._id || "-"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={profile?.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}>
                {profile?.isActive ? "Account Active" : "Account Inactive"}
              </Badge>
              {profile?.updatedAt ? (
                <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  Updated {formatDate(profile.updatedAt)}
                </Badge>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="space-y-3 border-zinc-300 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recent Notices</h2>
                <p className="text-xs text-zinc-500">Latest announcements from live dashboard stream</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-md border border-zinc-300 bg-zinc-100 p-1.5 dark:border-zinc-700 dark:bg-zinc-900">
                  <Image src="/globe.svg" alt="Notices" width={16} height={16} />
                </div>
                <Megaphone size={16} className="text-zinc-500" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {(stats.recentNotices ?? []).slice(0, 4).map((notice) => (
              <div key={notice._id} className="rounded-xl border border-zinc-300 bg-white p-3 shadow-xs dark:border-zinc-700 dark:bg-zinc-950/70">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{notice.title || "Untitled notice"}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs uppercase tracking-widest text-zinc-500">
                      <Image src="/file.svg" alt="notice type" width={12} height={12} />
                      {notice.targetType || "broadcast"}
                    </p>
                  </div>
                  <Badge className={noticeStatusTone(notice.status)}>{notice.status || "active"}</Badge>
                </div>
                <p className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                  {notice.message || "No message content."}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{notice.createdAt ? formatDate(notice.createdAt) : "No timestamp"}</span>
                  <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">Notice</span>
                </div>
              </div>
            ))}
            {!stats.recentNotices?.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
                <div className="mx-auto mb-2 w-fit rounded-lg bg-white p-2 shadow-sm dark:bg-zinc-950">
                  <Image src="/window.svg" alt="No notices" width={22} height={22} />
                </div>
                <p className="text-sm font-medium">No notices available</p>
                <p className="mt-1 text-xs text-zinc-500">Published notices will appear here once available from API.</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today Activity Snapshot</h2>
          <CalendarClock size={16} className="text-zinc-500" />
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={activitySnapshot}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#f97316" fill="#fb923c66" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {activitySnapshot.map((item) => (
            <div key={item.name} className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{item.name}</p>
              <p className="mt-1 text-xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
            <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{stats.upcomingMeetings?.length || 0}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {stats.upcomingMeetings?.length
              ? "Meetings are available in your upcoming schedule."
              : "No upcoming meetings scheduled."}
          </p>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Enquiries</h2>
            <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{stats.recentEnquiries?.length || 0}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {stats.recentEnquiries?.length
              ? "New enquiries are available for follow-up."
              : "No recent enquiries found."}
          </p>
        </Card>
      </div>
    </div>
  );
}
