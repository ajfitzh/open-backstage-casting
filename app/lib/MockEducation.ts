// app/lib/mockEducation.ts

// 1. The Classes you provided
export const MOCK_CLASSES = [
  { id: 101, name: "AVL Control Freaks", teacher: "Javier Negron", time: "Tue 6-8pm", enrolled: 7 },
  { id: 102, name: "Double Take - Ultimate Performance", teacher: "Staff", time: "Mon 6-8pm", enrolled: 16 },
  { id: 103, name: "Giving the Go: Stage Management", teacher: "Staff", time: "Mon 6-8pm", enrolled: 7 },
  { id: 104, name: "Harmonies and Heartbeats", teacher: "Staff", time: "Mon 6-8pm", enrolled: 14 },
  { id: 105, name: "Dancing Through Life", teacher: "Staff", time: "Mon 6-8pm", enrolled: 12 }
];

// 2.   Generate Random Enrollment & Attendance History
// We generate this on the fly so it matches YOUR existing 'people' IDs
export function getStudentClassData(personId: number) {
    // Deterministic random (so it stays consistent for the demo)
    const isEnrolled = (personId % 3) === 0; // 1 in 3 kids are in a class
    if (!isEnrolled) return null;

    // Assign a random class from the list above
    const classIndex = personId % MOCK_CLASSES.length;
    const assignedClass = MOCK_CLASSES[classIndex];

    // Simulate Attendance History (Last 4 weeks)
    // Let's make Person #32 a "Problem Student" (Truant)
    const isProblemStudent = personId === 32; 

    return {
        className: assignedClass.name,
        teacher: assignedClass.teacher,
        // If problem student, 3 absences. Otherwise mostly present.
        absences: isProblemStudent ? 3 : (personId % 5 === 0 ? 1 : 0),
        history: [
            { date: "Dec 2", status: isProblemStudent ? "Absent" : "Present" },
            { date: "Dec 9", status: "Present" },
            { date: "Dec 16", status: isProblemStudent ? "Absent" : "Present" },
            { date: "Jan 6", status: isProblemStudent ? "Absent" : "Present" },
        ]
    };
}