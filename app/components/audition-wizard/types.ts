// app/components/audition-wizard/types.ts

export type ConflictLevel = "available" | "absent" | "late" | "tentative";
export type ConflictEntry = { level: ConflictLevel; notes: string; };

export type AuditionFormData = {
  fearOfHeights: any;
  otherTalents: string;
  fullName: string; dob: string; sex: string; grade: string;
  hairColor: string; heightFt: string; heightIn: string; headshotUrl: string | null;
  preferredRoles: string; acceptAnyRole: boolean;
  songTitle: string; musicFileName: string; usePresetSong: boolean; 
  auditionSlotId: string | null;
  conflicts: Record<string, ConflictEntry>;
  callbackStatus: "" | "in-person" | "virtual" | "unavailable"; // <-- Default is now empty
  
  preShow1: string; preShow2: string; preShow3: string;
  show1: string; show2: string; show3: string;
  chairInterest: "" | "yes" | "maybe" | "no"; // <-- 3-way choice
  chairPreference: string;

  offBookAgreement: boolean; 
  parentCommitteeAgreement: boolean;
  studentSignature: boolean; 
  parentSignature: boolean;  
  vocalRange?: string;
  acceptRomance?: boolean;
};

export interface AuditionSlot {
  id: string; day: string; time: string; capacity: number; taken: number; isFull?: boolean;
}

export const GRADES = ["7th", "8th", "9th", "10th", "11th", "12th", "College", "Grad"];
export const HAIR_COLORS = ["Blonde", "Brown", "Black", "Red", "Auburn", "Grey", "Other"];
export const INCHES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

export const PRE_SHOW_COMMITTEES = [
  "Publicity", "Set Dressing", "Sets", "Raffles", 
  "Greenroom/Backstage", "Costume/Quick Change", "Props", "Makeup", "Hair"
];

export const SHOW_COMMITTEES = [
  "Tech", "Ninjas/Set Movers", "Box Office/House", 
  "Concessions", "Security", "Raffles", 
  "Greenroom/Backstage", "Costume/Quick Change", "Props", "Makeup", "Hair"
];

export const REHEARSAL_DATES = [
  { id: "june_11", label: "June 11 (Music)", time: "10am - 1pm", type: "encouraged" },
  { id: "june_20", label: "June 20 (Music)", time: "10am - 3pm", type: "encouraged" },
  { id: "june_23", label: "June 23 (Music)", time: "4:30pm - 8pm", type: "encouraged" },
  { id: "july_06", label: "July 6 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_07", label: "July 7 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_08", label: "July 8 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_09", label: "July 9 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_10", label: "July 10 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_11", label: "July 11 (Sets)", time: "All Day", type: "critical" },
  { id: "july_13", label: "July 13 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_14", label: "July 14 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_15", label: "July 15 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_16", label: "July 16 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_23", label: "July 23 (Tech)", time: "4pm - 9pm", type: "mandatory" },
];

export const PRESET_SONGS = [
  { 
    id: "reflection", title: "Reflection (Mulan)", 
    audioUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/Reflection%20-%20Mulan%20_%20Karaoke%20Version%20_%20KaraFun.mp3",
    lyricsUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/reflection-lyrics.pdf"
  },
  { 
    id: "tomorrow", title: "Tomorrow (Annie)", 
    audioUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/Tomorrow%20from%20Annie%20-%20Karaoke%20Track%20with%20Lyrics%20on%20Screen%20(1).mp3",
    lyricsUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/tomorrow-lyrics.pdf"
  },
  { 
    id: "consider_yourself", title: "Consider Yourself (Oliver!)", 
    audioUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/Consider%20Yourself%20-%20Oliver%20(Karaoke%20Version).mp3",
    lyricsUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/oliver-lyrics.pdf"
  },
  { 
    id: "friend_in_me", title: "Friend In Me (Toy Story)", 
    audioUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/Youve%20Got%20a%20Friend%20in%20Me%20-%20Toy%20Story%20(Randy%20Newman)%20_%20Karaoke%20Version%20_%20KaraFun.mp3",
    lyricsUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/friend-in-me-lyrics.pdf"
  },
];

export const INITIAL_DATA: AuditionFormData = {
  fullName: "", dob: "", sex: "", grade: "",
  hairColor: "", heightFt: "", heightIn: "", headshotUrl: null,
  preferredRoles: "", acceptAnyRole: false,
  songTitle: "", musicFileName: "", usePresetSong: false,
  auditionSlotId: null,
  conflicts: {}, callbackStatus: "",
  preShow1: "", preShow2: "", preShow3: "",
  show1: "", show2: "", show3: "",
  chairInterest: "", chairPreference: "",
  offBookAgreement: false, parentCommitteeAgreement: false,
  studentSignature: false, parentSignature: false,
  fearOfHeights: undefined,
  otherTalents: ""
};