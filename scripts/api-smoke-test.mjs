import axios from "axios";

const BASE_URL = "https://ascento-abacus-backend.onrender.com/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@school.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@123";
const suffix = Date.now();

const state = {
  sessionKey: "",
  domainId: "",
  classId: "",
  sectionId: "",
  subjectId: "",
  teacherId: "",
  studentId: "",
  academicYearId: "",
  examId: "",
  examSubjectId: "",
  feeId: "",
  assignmentId: "",
  timetableIds: [],
};

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

function authHeaders() {
  return { "x-session-key": state.sessionKey };
}

async function request(name, run, allowFail = false) {
  try {
    const result = await run();
    console.log(`OK   ${name}`);
    return result;
  } catch (error) {
    const message = error?.response?.data || error?.message;
    if (!allowFail) {
      console.error(`FAIL ${name}`, message);
      throw error;
    }
    console.warn(`WARN ${name}`, message);
    return null;
  }
}

async function cleanup() {
  const deletions = [
    ["timetable3", () => state.timetableIds[2] && client.delete(`/admin/timetable/${state.timetableIds[2]}`, { headers: authHeaders() })],
    ["timetable2", () => state.timetableIds[1] && client.delete(`/admin/timetable/${state.timetableIds[1]}`, { headers: authHeaders() })],
    ["timetable1", () => state.timetableIds[0] && client.delete(`/admin/timetable/${state.timetableIds[0]}`, { headers: authHeaders() })],
    ["exam-subject", () => state.examSubjectId && client.delete(`/admin/exam-subject/${state.examSubjectId}`, { headers: authHeaders() })],
    ["exam", () => state.examId && client.delete(`/admin/exams/${state.examId}`, { headers: authHeaders() })],
    ["assignment", () => state.assignmentId && client.delete(`/admin/teacher-assignments/${state.assignmentId}`, { headers: authHeaders() })],
    ["student", () => state.studentId && client.delete(`/admin/students/${state.studentId}`, { headers: authHeaders() })],
    ["teacher", () => state.teacherId && client.delete(`/admin/teachers/${state.teacherId}`, { headers: authHeaders() })],
    ["subject", () => state.subjectId && client.delete(`/admin/subjects/${state.subjectId}`, { headers: authHeaders() })],
    ["section", () => state.sectionId && client.delete(`/admin/sections/${state.sectionId}`, { headers: authHeaders() })],
    ["class", () => state.classId && client.delete(`/admin/classes/${state.classId}`, { headers: authHeaders() })],
    ["domain", () => state.domainId && client.delete(`/admin/domains/${state.domainId}`, { headers: authHeaders() })],
    ["academic-year", () => state.academicYearId && client.delete(`/admin/academic-years/${state.academicYearId}`, { headers: authHeaders() })],
  ];

  for (const [name, fn] of deletions) {
    await request(`cleanup ${name}`, async () => {
      const res = await fn();
      return res;
    }, true);
  }

  await request("logout", async () => client.post("/auth/admin/logout", {}, { headers: authHeaders() }), true);
}

async function main() {
  console.log(`Running smoke test on ${BASE_URL}`);

  const login = await request("admin login", async () =>
    client.post("/auth/admin/login", {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  );

  state.sessionKey = login.data?.data?.sessionKey;
  if (!state.sessionKey) {
    throw new Error("No sessionKey returned");
  }

  await request("profile", async () => client.get("/admin/profile", { headers: authHeaders() }));
  await request("dashboard", async () => client.get("/admin/dashboard", { headers: authHeaders() }));

  const domain = await request("create domain", async () =>
    client.post(
      "/admin/domains",
      {
        name: `Science Stream ${suffix}`,
        code: `SCI${suffix}`,
        description: "Science curriculum",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );
  state.domainId = domain.data?.data?._id;

  await request("list domains", async () => client.get("/admin/domains", { headers: authHeaders() }));
  await request("update domain", async () =>
    client.put(
      `/admin/domains/${state.domainId}`,
      { description: "Science curriculum and lab focus", status: "active" },
      { headers: authHeaders() },
    ),
  );

  const klass = await request("create class", async () =>
    client.post(
      "/admin/classes",
      { name: `Grade 8 ${suffix}`, domainId: state.domainId, description: "Middle school grade 8" },
      { headers: authHeaders() },
    ),
  );
  state.classId = klass.data?.data?._id;

  const section = await request("create section", async () =>
    client.post(
      "/admin/sections",
      { name: `Section A ${suffix}`, classId: state.classId },
      { headers: authHeaders() },
    ),
  );
  state.sectionId = section.data?.data?._id;

  const subject = await request("create subject", async () =>
    client.post(
      "/admin/subjects",
      {
        name: `Mathematics ${suffix}`,
        code: `MATH${suffix}`,
        classId: state.classId,
        description: "Mathematics for grade 8",
      },
      { headers: authHeaders() },
    ),
  );
  state.subjectId = subject.data?.data?._id;

  const teacher = await request("create teacher", async () =>
    client.post(
      "/admin/teachers",
      {
        name: `Aarav Sharma ${suffix}`,
        email: `aarav.${suffix}@school.com`,
        phone: `98${suffix}`.slice(0, 10),
        domainId: state.domainId,
        status: "active",
        address: "123 Main Street",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        dateOfBirth: "1985-06-15",
        gender: "male",
        qualification: "M.Sc. Mathematics",
        experienceYears: 10,
        joiningDate: "2020-04-01",
        profilePhoto: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      },
      { headers: authHeaders() },
    ),
  );
  state.teacherId = teacher.data?.data?.teacher?._id || teacher.data?.data?._id;

  const assignment = await request("assign teacher", async () =>
    client.post(
      "/admin/assign-teacher",
      {
        teacherId: state.teacherId,
        classId: state.classId,
        sectionId: state.sectionId,
        subjectId: state.subjectId,
        academicYear: "2026-2027",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );
  state.assignmentId = assignment.data?.data?._id;

  const student = await request("create student", async () =>
    client.post(
      "/admin/students",
      {
        fullName: `Student Test ${suffix}`,
        dob: "2012-05-10",
        age: 13,
        gender: "male",
        parentName: "Parent Test",
        parentPhone: `97${suffix}`.slice(0, 10),
        parentEmail: `student.parent.${suffix}@school.com`,
        domainId: state.domainId,
        password: "Student@123",
        status: "active",
        address: "12 School Road",
        city: "Mumbai",
        state: "Maharashtra",
        bloodGroup: "O+",
      },
      { headers: authHeaders() },
    ),
  );
  state.studentId = student.data?.data?.student?._id || student.data?.data?.student?.id || student.data?.data?._id;

  const year = await request("create academic year", async () =>
    client.post(
      "/admin/academic-years",
      {
        name: `2026-2027-${suffix}`,
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );
  state.academicYearId = year.data?.data?._id;

  const exam = await request("create exam", async () =>
    client.post(
      "/admin/exams",
      {
        examName: `Mid Term ${suffix}`,
        classId: state.classId,
        academicYearId: state.academicYearId,
        examStartDate: "2026-09-10",
        examEndDate: "2026-09-20",
        description: "Mid term written examinations",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );
  state.examId = exam.data?.data?._id;

  const examSubject = await request("create exam subject", async () =>
    client.post(
      "/admin/exam-subject",
      {
        examId: state.examId,
        subjectId: state.subjectId,
        totalMarks: 100,
        passingMarks: 35,
        examDate: "2026-09-15",
        startTime: "09:00",
        endTime: "12:00",
      },
      { headers: authHeaders() },
    ),
  );
  state.examSubjectId = examSubject.data?.data?._id;

  await request("enroll student", async () =>
    client.post(
      "/admin/enroll-student",
      {
        studentId: state.studentId,
        classId: state.classId,
        sectionId: state.sectionId,
        academicYear: "2026-2027",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );

  const fee = await request("create fee", async () =>
    client.post(
      "/admin/fees",
      {
        studentId: state.studentId,
        classId: state.classId,
        academicYearId: state.academicYearId,
        feeType: "tuition",
        amount: 15000,
        dueDate: "2026-06-30",
        paymentStatus: "pending",
      },
      { headers: authHeaders() },
    ),
  );
  state.feeId = fee.data?.data?._id;

  await request("mark fee paid", async () =>
    client.put(
      "/admin/fees/pay",
      {
        feeId: state.feeId,
        paymentMethod: "upi",
        transactionReference: `TXN-SCHOOL-${suffix}`,
        paymentDate: "2026-04-01",
      },
      { headers: authHeaders() },
    ),
  );

  const tt1 = await request("create timetable p1", async () =>
    client.post(
      "/admin/timetable",
      {
        classId: state.classId,
        sectionId: state.sectionId,
        subjectId: state.subjectId,
        teacherId: state.teacherId,
        academicYearId: state.academicYearId,
        dayOfWeek: "monday",
        periodNumber: 1,
        startTime: "09:00",
        endTime: "09:45",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );
  state.timetableIds.push(tt1.data?.data?._id);

  const tt2 = await request("create timetable p2", async () =>
    client.post(
      "/admin/timetable",
      {
        classId: state.classId,
        sectionId: state.sectionId,
        subjectId: state.subjectId,
        teacherId: state.teacherId,
        academicYearId: state.academicYearId,
        dayOfWeek: "monday",
        periodNumber: 2,
        startTime: "09:45",
        endTime: "10:30",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );
  state.timetableIds.push(tt2.data?.data?._id);

  await request("class timetable view", async () =>
    client.get(`/class/timetable/${state.classId}`, {
      headers: authHeaders(),
      params: { sectionId: state.sectionId, academicYearId: state.academicYearId, status: "active" },
    }),
  );

  await request("create reminder", async () =>
    client.post(
      "/admin/reminders",
      {
        title: "Fee Payment Reminder",
        description: "Please clear pending fee before due date",
        targetType: "class",
        targetId: state.classId,
        reminderDate: "2026-04-15",
      },
      { headers: authHeaders() },
    ),
  );

  await request("create event", async () =>
    client.post(
      "/admin/events",
      {
        title: "Annual Sports Day",
        description: "School-wide athletics and games",
        eventDate: "2026-12-20",
        location: "Main Ground",
        attachments: ["https://example.com/notice/sports-day.pdf"],
      },
      { headers: authHeaders() },
    ),
  );

  await request("create notification", async () =>
    client.post(
      "/admin/notifications",
      {
        title: "Platform Maintenance",
        message: "Portal update scheduled at 10 PM",
        targetType: "broadcast",
        status: "active",
      },
      { headers: authHeaders() },
    ),
  );

  await request("list enquiries", async () => client.get("/admin/enquiries", { headers: authHeaders() }), true);

  console.log("Smoke test flow complete. Starting cleanup.");
}

main()
  .catch(async (error) => {
    console.error("Smoke test terminated with error", error?.message || error);
  })
  .finally(async () => {
    await cleanup();
  });
