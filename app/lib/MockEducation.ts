// app/lib/mockEducation.ts

export const MOCK_CLASSES = [
  { id: 101, name: "AVL Control Freaks", teacher: "Javier Negron", day: "Tuesday", time: "6:00pm - 8:00pm", location: "River of Life", enrolled: 7, ages: "13-18" },
  { id: 102, name: "Conquering the Craft of Choreography", teacher: "Ellie Jany", day: "Tuesday", time: "6:00pm - 8:00pm", location: "Hope Presbyterian Church", enrolled: 5, ages: "13-18" },
  { id: 103, name: "Dancing Through Life: Musical Theater", teacher: "Emily Williams", day: "Monday", time: "6:00pm - 8:00pm", location: "River Club Church", enrolled: 9, ages: "8-12" },
  { id: 104, name: "Double Take - Ultimate Performance", teacher: "Rebecca Moffitt & Pam King", day: "Monday", time: "6:00pm - 8:00pm", location: "River Club Church", enrolled: 16, ages: "13-18" },
  { id: 105, name: "Double Take: Sing It, Dance It!", teacher: "Pam King & Rebecca Moffitt", day: "Monday", time: "6:00pm - 8:00pm", location: "River Club Church", enrolled: 12, ages: "8-12" },
  { id: 106, name: "Giving the Go: Stage Management", teacher: "Brittany Walters", day: "Monday", time: "6:00pm - 8:00pm", location: "River Club Church", enrolled: 7, ages: "14-18" },
  { id: 107, name: "Happily Ever Laughter", teacher: "Jacob Ramirez", day: "Tuesday", time: "6:00pm - 8:00pm", location: "Hope Presbyterian Church", enrolled: 10, ages: "8-12" },
  { id: 108, name: "Harmonies and Heartbeats!", teacher: "Jacob Ramirez", day: "Monday", time: "6:00pm - 8:00pm", location: "Highway Assembly", enrolled: 14, ages: "13-18" },
  { id: 109, name: "Improv-aganza!", teacher: "Connor Worthington", day: "Tuesday", time: "6:00pm - 8:00pm", location: "Hope Presbyterian Church", enrolled: 16, ages: "12-18" },
  { id: 110, name: "Lion King KIDS - CYT Lite", teacher: "Anna H, Brianne C, Hailey B", day: "Tuesday", time: "6:00pm - 8:00pm", location: "River of Life", enrolled: 40, ages: "8-12" },
  { id: 111, name: "Our Gang - Minions", teacher: "Tiffany Jeffris", day: "Tuesday", time: "6:00pm - 7:30pm", location: "River of Life", enrolled: 12, ages: "5-8" },
  { id: 112, name: "Very Punny!", teacher: "Candace Johnson", day: "Monday", time: "6:00pm - 8:00pm", location: "Highway Assembly", enrolled: 6, ages: "13-18" },
];

// --- HELPER: MOCK STUDENT ENROLLMENT ---
// This ensures that when you look at the Cast List, random actors are assigned to these real classes.
export function getStudentClassData(personId: number) {
    // 1. Determine if enrolled (Let's say 40% of cast is in a class)
    const isEnrolled = (personId % 5) !== 0; 
    if (!isEnrolled) return null;

    // 2. Assign a class based on ID to keep it consistent
    const classIndex = personId % MOCK_CLASSES.length;
    const assignedClass = MOCK_CLASSES[classIndex];

    // 3. Simulate Attendance
    // Make Person ID #32 and #15 "At Risk" (Truant)
    const isAtRisk = personId === 32 || personId === 15; 

    return {
        className: assignedClass.name,
        teacher: assignedClass.teacher,
        // If at risk, they have 3 absences. Otherwise 0 or 1.
        absences: isAtRisk ? 3 : (personId % 7 === 0 ? 1 : 0),
        history: [
            { date: "Dec 2", status: isAtRisk ? "Absent" : "Present" },
            { date: "Dec 9", status: "Present" },
            { date: "Dec 16", status: isAtRisk ? "Absent" : "Present" },
            { date: "Jan 6", status: isAtRisk ? "Absent" : "Present" },
        ]
    };
}