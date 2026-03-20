import { api } from "@/lib/axios";
import type {
  AdminProfile,
  ApiEnvelope,
  DashboardStats,
  Domain,
  DomainPayload,
  LoginData,
  LoginPayload,
  PaginatedList,
  Student,
  StudentPayload,
  Teacher,
  TeacherPayload,
  TimetableEntry,
  TimetablePayload,
} from "@/types/api";

const unwrap = <T>(response: { data: ApiEnvelope<T> | T }): T => {
  const payload = response.data as ApiEnvelope<T>;
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return response.data as T;
};

export const authApi = {
  login: async (payload: LoginPayload) => unwrap<LoginData>(await api.post("/auth/admin/login", payload)),
  logout: async () => unwrap(await api.post("/auth/admin/logout")),
  profile: async () => unwrap<AdminProfile>(await api.get("/admin/profile")),
  changePassword: async (payload: { currentPassword: string; newPassword: string }) =>
    unwrap(await api.put("/admin/change-password", payload)),
};

export const dashboardApi = {
  get: async () => unwrap<DashboardStats>(await api.get("/admin/dashboard")),
};

export const domainsApi = {
  list: async () => {
    const payload = unwrap<PaginatedList<Domain> | Domain[]>(
      await api.get<ApiEnvelope<PaginatedList<Domain>> | ApiEnvelope<Domain[]> | PaginatedList<Domain> | Domain[]>(
        "/admin/domains",
      ),
    );
    if (Array.isArray(payload)) {
      return payload;
    }
    return payload.data ?? [];
  },
  getById: async (id: string) =>
    unwrap<Domain>(await api.get<ApiEnvelope<Domain> | Domain>(`/admin/domains/${id}`)),
  create: async (payload: DomainPayload) =>
    unwrap<Domain>(await api.post<ApiEnvelope<Domain> | Domain>("/admin/domains", payload)),
  update: async (id: string, payload: Partial<DomainPayload>) =>
    unwrap<Domain>(await api.put<ApiEnvelope<Domain> | Domain>(`/admin/domains/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/domains/${id}`)),
};

export const teachersApi = {
  list: async () => unwrap<Teacher[]>(await api.get("/admin/teachers")),
  getById: async (id: string) => unwrap<Teacher>(await api.get(`/admin/teachers/${id}`)),
  create: async (payload: TeacherPayload) => unwrap(await api.post("/admin/teachers", payload)),
  update: async (id: string, payload: TeacherPayload) => unwrap(await api.put(`/admin/teachers/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/teachers/${id}`)),
  assignTeacher: async (payload: {
    teacherId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
    academicYear: string;
    status: string;
  }) => unwrap(await api.post("/admin/assign-teacher", payload)),
  assignments: async () => unwrap(await api.get("/admin/teacher-assignments")),
  updateAssignment: async (id: string, payload: { status: string }) =>
    unwrap(await api.put(`/admin/teacher-assignments/${id}`, payload)),
  removeAssignment: async (id: string) => unwrap(await api.delete(`/admin/teacher-assignments/${id}`)),
};

export const studentsApi = {
  list: async (domainId?: string) =>
    unwrap<Student[]>(await api.get("/admin/students", { params: domainId ? { domainId } : undefined })),
  getById: async (id: string) => unwrap<Student>(await api.get(`/admin/students/${id}`)),
  create: async (payload: StudentPayload) => unwrap(await api.post("/admin/students", payload)),
  update: async (id: string, payload: Partial<StudentPayload>) => unwrap(await api.put(`/admin/students/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/students/${id}`)),
  enroll: async (payload: {
    studentId: string;
    classId: string;
    sectionId: string;
    academicYear: string;
    status: string;
  }) => unwrap(await api.post("/admin/enroll-student", payload)),
  enrollments: async (studentId?: string) =>
    unwrap(await api.get("/admin/enrollments", { params: studentId ? { studentId } : undefined })),
  promote: async (payload: {
    studentId: string;
    fromClassId: string;
    toClassId: string;
    fromSectionId: string;
    toSectionId: string;
    newAcademicYear: string;
  }) => unwrap(await api.post("/admin/promote-student", payload)),
};

const listOnly = (url: string) => ({
  list: async (params?: Record<string, string>) => unwrap(await api.get(url, { params })),
});

export const classesApi = {
  ...listOnly("/admin/classes"),
  getById: async (id: string) => unwrap(await api.get(`/admin/classes/${id}`)),
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/classes", payload)),
  update: async (id: string, payload: Record<string, unknown>) => unwrap(await api.put(`/admin/classes/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/classes/${id}`)),
};

export const sectionsApi = {
  ...listOnly("/admin/sections"),
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/sections", payload)),
  update: async (id: string, payload: Record<string, unknown>) => unwrap(await api.put(`/admin/sections/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/sections/${id}`)),
};

export const subjectsApi = {
  ...listOnly("/admin/subjects"),
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/subjects", payload)),
  update: async (id: string, payload: Record<string, unknown>) => unwrap(await api.put(`/admin/subjects/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/subjects/${id}`)),
};

export const yearsApi = {
  ...listOnly("/admin/academic-years"),
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/academic-years", payload)),
  update: async (id: string, payload: Record<string, unknown>) => unwrap(await api.put(`/admin/academic-years/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/academic-years/${id}`)),
};

export const examsApi = {
  ...listOnly("/admin/exams"),
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/exams", payload)),
  update: async (id: string, payload: Record<string, unknown>) => unwrap(await api.put(`/admin/exams/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/exams/${id}`)),
};

export const examSubjectsApi = {
  list: async (examId: string) => unwrap(await api.get(`/admin/exam-subjects/${examId}`)),
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/exam-subject", payload)),
  update: async (id: string, payload: Record<string, unknown>) => unwrap(await api.put(`/admin/exam-subject/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/exam-subject/${id}`)),
};

export const feesApi = {
  ...listOnly("/admin/fees"),
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/fees", payload)),
  pay: async (payload: Record<string, unknown>) => unwrap(await api.put("/admin/fees/pay", payload)),
};

export const attendanceApi = {
  list: async (params?: Record<string, string>) => unwrap(await api.get("/admin/attendance", { params })),
};

export const reportsApi = {
  getCard: async (studentId: string, examId?: string) =>
    unwrap(await api.get(`/admin/report-card/${studentId}`, { params: examId ? { examId } : undefined })),
};

export const timetableApi = {
  create: async (payload: TimetablePayload) => unwrap(await api.post("/admin/timetable", payload)),
  update: async (id: string, payload: Partial<TimetablePayload>) => unwrap(await api.put(`/admin/timetable/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/timetable/${id}`)),
  classView: async (classId: string, params?: Record<string, string>) =>
    unwrap<TimetableEntry[]>(await api.get(`/class/timetable/${classId}`, { params })),
  teacherView: async (params?: Record<string, string>) => unwrap(await api.get("/teacher/timetable", { params })),
  studentView: async (params?: Record<string, string>) => unwrap(await api.get("/student/timetable", { params })),
};

export const notificationsApi = {
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/notifications", payload)),
};

export const eventsApi = {
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/events", payload)),
};

export const remindersApi = {
  create: async (payload: Record<string, unknown>) => unwrap(await api.post("/admin/reminders", payload)),
};

export const enquiriesApi = {
  list: async () => unwrap(await api.get("/admin/enquiries")),
  update: async (id: string, payload: Record<string, unknown>) => unwrap(await api.put(`/admin/enquiries/${id}`, payload)),
  remove: async (id: string) => unwrap(await api.delete(`/admin/enquiries/${id}`)),
};
