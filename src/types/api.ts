export type ApiEnvelope<T> = {
  success?: boolean;
  status?: number;
  message?: string;
  data: T;
};

export type PaginatedList<T> = {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginData = {
  sessionKey: string;
};

export type DashboardStats = {
  totalDomains?: number;
  totalClasses?: number;
  totalTeachers?: number;
  totalStudents?: number;
  totalSubjects?: number;
  newStudentsToday?: number;
  newTeachersToday?: number;
  attendanceTodayPercentage?: number;
  totalRevenue?: number;
  feesCollectedThisMonth?: number;
  pendingFees?: number;
  pendingEnquiries?: number;
  upcomingMeetings?: unknown[];
  recentNotices?: Array<{
    _id: string;
    title: string;
    message: string;
    targetType?: string;
    targetId?: string | null;
    status?: string;
    createdAt?: string;
  }>;
  recentEnquiries?: unknown[];
};

export type AdminProfile = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
};

export type Domain = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type DomainPayload = {
  name: string;
  code: string;
  description?: string;
  status: "active" | "inactive";
};

export type Teacher = {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  domainId: string;
  status: "active" | "inactive";
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

export type TeacherPayload = {
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

export type Student = {
  _id: string;
  fullName: string;
  dob?: string;
  age?: number;
  gender: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  domainId: string;
  status: "active" | "inactive";
  address?: string;
  city?: string;
  state?: string;
  bloodGroup?: string;
};

export type StudentPayload = {
  fullName: string;
  dob: string;
  age: number;
  gender: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  domainId: string;
  password?: string;
  status: "active" | "inactive";
  address: string;
  city: string;
  state: string;
  bloodGroup: string;
};

export type TimetableEntry = {
  _id: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  status: string;
};

export type TimetablePayload = {
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  status: string;
};
