"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Users,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Save,
  UserPlus,
  Trash2,
  Settings2,
} from "lucide-react";
import { fetchRosterAction } from "@/app/lib/actions";
import {
  deleteAcademyClass,
  enrollStudentInClass,
  saveClassAttendance,
  unenrollStudentFromClass,
  updateAcademyClass,
} from "@/app/actions/admin-crud";

interface EducationClass {
  id: number;
  name: string;
  day: string;
  time: string;
  teacher: string;
  location?: string;
  spaceId?: number | null;
  minAge?: number;
  maxAge?: number;
  type?: string;
  status?: string;
}

export interface ClassStudent {
  id: number;
  name: string;
  age: string | number;
  email: string;
  phone: string;
  status?: string;
}

export interface AcademyAdminOptions {
  sessions: { id: number; name: string }[];
  teachers: { id: number; name: string; email: string }[];
  allPeople: { id: number; name: string; email: string; phone: string }[];
  spaces: { id: number; name: string }[];
}

interface Props {
  tenant?: string;
  cls: EducationClass;
  adminOptions?: AcademyAdminOptions;
  onClose: () => void;
}

export default function ClassManagerModal({ tenant = "", cls, adminOptions, onClose }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"roster" | "attendance" | "edit">("roster");
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Enroll student state
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Attendance State
  const [attendance, setAttendance] = useState<Record<number, string>>({});

  // Edit Class State
  const [className, setClassName] = useState(cls.name || "");
  const [teacherId, setTeacherId] = useState(() => {
    const match = adminOptions?.teachers.find(
      (t) => t.name.toLowerCase() === (cls.teacher || "").toLowerCase()
    );
    return match ? String(match.id) : "";
  });
  const [spaceId, setSpaceId] = useState(cls.spaceId ? String(cls.spaceId) : "");
  const [day, setDay] = useState(cls.day || "Monday");
  const [timeSlot, setTimeSlot] = useState(cls.time || "");
  const [minAge, setMinAge] = useState(String(cls.minAge ?? 8));
  const [maxAge, setMaxAge] = useState(String(cls.maxAge ?? 18));
  const [type, setType] = useState(cls.type || "Acting");
  const [status, setStatus] = useState(cls.status || "Active");

  useEffect(() => {
    async function load() {
      const data = await fetchRosterAction(cls.id, tenant || undefined);
      setStudents(data || []);
      setLoading(false);
    }
    load();
  }, [cls.id, tenant]);

  const instructors = students.filter((s) => s.status === "Instructor");
  const enrolledStudents = students.filter((s) => s.status !== "Instructor");

  const toggleAttendance = (studentId: number) => {
    const current = attendance[studentId];
    const next = current === "present" ? "late" : current === "late" ? "absent" : "present";
    setAttendance((prev) => ({ ...prev, [studentId]: next }));
  };

  const markAllPresent = () => {
    const update: Record<number, string> = {};
    enrolledStudents.forEach((s) => (update[s.id] = "present"));
    setAttendance(update);
  };

  const handleSaveAttendance = async () => {
    if (!tenant) return;
    setBusy(true);
    setNotice(null);
    const todayIso = new Date().toISOString().split("T")[0];
    const res = await saveClassAttendance(tenant, cls.id, todayIso, attendance);
    setBusy(false);
    if (res.success) {
      setNotice({
        type: "success",
        text: `Saved attendance for ${"savedCount" in res ? res.savedCount : Object.keys(attendance).length} student(s) (${todayIso}).`,
      });
    } else {
      setNotice({ type: "error", text: res.error || "Failed to save attendance." });
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedStudentId) return;
    setBusy(true);
    setNotice(null);
    const res = await enrollStudentInClass(tenant, cls.id, Number(selectedStudentId));
    setBusy(false);
    if (res.success && "student" in res && res.student) {
      setStudents((prev) =>
        prev.some((s) => s.id === res.student!.id) ? prev : [...prev, res.student!]
      );
      setSelectedStudentId("");
      setNotice({ type: "success", text: `Enrolled ${res.student.name}.` });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not enroll student." });
    }
  };

  const handleDropStudent = async (student: ClassStudent) => {
    if (!tenant) return;
    if (!confirm(`Remove ${student.name} from ${cls.name}?`)) return;
    setBusy(true);
    setNotice(null);
    const res = await unenrollStudentFromClass(tenant, cls.id, student.id);
    setBusy(false);
    if (res.success) {
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setNotice({ type: "success", text: `Removed ${student.name} from class.` });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not remove student." });
    }
  };

  const handleSaveClassEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setBusy(true);
    setNotice(null);
    const res = await updateAcademyClass(tenant, cls.id, {
      className,
      teacherId: teacherId ? Number(teacherId) : null,
      spaceId: spaceId ? Number(spaceId) : null,
      day,
      timeSlot,
      minAge: parseInt(minAge, 10) || 5,
      maxAge: parseInt(maxAge, 10) || 18,
      type,
      status,
    });
    setBusy(false);
    if (res.success) {
      setNotice({ type: "success", text: "Class details updated." });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not update class." });
    }
  };

  const handleDeleteClass = async () => {
    if (!tenant) return;
    if (!confirm(`Permanently delete "${cls.name}" and its enrollments?`)) return;
    setBusy(true);
    const res = await deleteAcademyClass(tenant, cls.id);
    setBusy(false);
    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setNotice({ type: "error", text: res.error || "Could not delete class." });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-4xl h-[82vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 bg-zinc-950 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{cls.name}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm font-medium text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {cls.day}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>{cls.time}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="text-blue-400">{cls.teacher}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/5 bg-black/20 shrink-0">
          <TabButton
            active={activeTab === "roster"}
            onClick={() => setActiveTab("roster")}
            icon={<Users size={16} />}
            label={`Roster (${enrolledStudents.length})`}
          />
          <TabButton
            active={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
            icon={<CheckCircle2 size={16} />}
            label="Attendance"
          />
          {tenant && (
            <TabButton
              active={activeTab === "edit"}
              onClick={() => setActiveTab("edit")}
              icon={<Settings2 size={16} />}
              label="Edit Class"
            />
          )}
        </div>

        {notice && (
          <div
            className={`mx-6 mt-4 px-4 py-2.5 rounded-xl text-xs font-bold border ${
              notice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50 custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <>
              {activeTab === "roster" && (
                <div className="space-y-4">
                  {tenant && adminOptions && adminOptions.allPeople.length > 0 && (
                    <form
                      onSubmit={handleEnrollStudent}
                      className="flex flex-col sm:flex-row gap-2 bg-zinc-950/80 border border-white/10 p-3 rounded-2xl"
                    >
                      <select
                        required
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-white"
                      >
                        <option value="">Select student to enroll...</option>
                        {adminOptions.allPeople.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.email ? `(${p.email})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={busy || !selectedStudentId}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-black uppercase text-white disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        Enroll
                      </button>
                    </form>
                  )}

                  {instructors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {instructors.map((inst) => (
                        <div
                          key={`inst-${inst.id}`}
                          className="bg-blue-500/10 border border-blue-500/20 px-3.5 py-2 rounded-xl flex items-center gap-2.5 text-xs"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                            Instructor
                          </span>
                          <span className="font-bold text-white">{inst.name}</span>
                          {inst.email && <span className="text-zinc-400">{inst.email}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {enrolledStudents.length === 0 ? (
                    <div className="text-center py-16 opacity-60">
                      <Users size={40} className="mx-auto mb-3 text-zinc-600" />
                      <p className="text-sm text-zinc-400">No students enrolled yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {enrolledStudents.map((student) => (
                        <div
                          key={student.id}
                          className="bg-zinc-950 border border-white/5 p-4 rounded-xl flex items-start justify-between gap-3 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 shrink-0">
                              {student.name.substring(0, 2).toUpperCase() || "??"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{student.name}</div>
                              <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5">
                                Age: {student.age || "?"}
                              </div>
                              <div className="space-y-0.5">
                                {student.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                                    <Mail size={11} className="text-zinc-600 shrink-0" />
                                    <span className="truncate">{student.email}</span>
                                  </div>
                                )}
                                {student.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                    <Phone size={11} className="text-zinc-600 shrink-0" />
                                    <span>{student.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {tenant && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDropStudent(student)}
                              className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                              title="Drop student from class"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                    <div className="text-xs font-bold text-blue-300 uppercase tracking-wide flex items-center gap-2">
                      <Calendar size={14} /> Today: {new Date().toLocaleDateString()}
                    </div>
                    <button
                      type="button"
                      onClick={markAllPresent}
                      className="text-[10px] font-black uppercase text-blue-400 hover:text-white transition-colors"
                    >
                      Mark All Present
                    </button>
                  </div>
                  {enrolledStudents.map((student) => {
                    const st = attendance[student.id];
                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleAttendance(student.id)}
                        className="group cursor-pointer bg-zinc-950 border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-zinc-800 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                              st === "present"
                                ? "bg-emerald-500 text-black"
                                : st === "late"
                                  ? "bg-amber-500 text-black"
                                  : st === "absent"
                                    ? "bg-red-500 text-white"
                                    : "bg-zinc-800 text-zinc-600"
                            }`}
                          >
                            {student.name.substring(0, 2).toUpperCase() || "??"}
                          </div>
                          <span className={`font-bold transition-colors ${st ? "text-white" : "text-zinc-400"}`}>
                            {student.name}
                          </span>
                        </div>

                        <div className="flex gap-1">
                          <StatusIndicator active={st === "present"} color="bg-emerald-500" icon={<CheckCircle2 size={14} />} />
                          <StatusIndicator active={st === "late"} color="bg-amber-500" icon={<Clock size={14} />} />
                          <StatusIndicator active={st === "absent"} color="bg-red-500" icon={<XCircle size={14} />} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "edit" && (
                <form onSubmit={handleSaveClassEdit} className="space-y-4 max-w-2xl mx-auto">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Class Name *</label>
                    <input
                      required
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Teacher</label>
                      <select
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      >
                        <option value="">Unassigned / TBD</option>
                        {(adminOptions?.teachers || []).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Classroom / Space</label>
                      <select
                        value={spaceId}
                        onChange={(e) => setSpaceId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      >
                        <option value="">Unassigned</option>
                        {(adminOptions?.spaces || []).map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Day</label>
                      <select
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      >
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "TBD"].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Time Slot</label>
                      <input
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        placeholder="e.g., 4:30 PM - 5:30 PM"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Min Age</label>
                      <input
                        type="number"
                        value={minAge}
                        onChange={(e) => setMinAge(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Max Age</label>
                      <input
                        type="number"
                        value={maxAge}
                        onChange={(e) => setMaxAge(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Category</label>
                      <input
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Full">Full</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleDeleteClass}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase disabled:opacity-50"
                    >
                      <Trash2 size={14} /> Delete Class
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Class
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* FOOTER (Attendance Only) */}
        {activeTab === "attendance" && (
          <div className="p-4 border-t border-white/5 bg-zinc-950 flex justify-end">
            <button
              type="button"
              disabled={busy || !tenant}
              onClick={handleSaveAttendance}
              className="bg-white text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
        active
          ? "bg-zinc-900 text-white border-b-2 border-blue-500"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function StatusIndicator({ active, color, icon }: any) {
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        active ? `${color} text-white shadow-lg scale-110` : "bg-transparent text-zinc-700"
      }`}
    >
      {icon}
    </div>
  );
}
