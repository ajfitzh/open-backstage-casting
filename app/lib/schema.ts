export const DB = {
  PEOPLE: {
    ID: "599",
    FIELDS: {
      FULL_NAME: "field_5735",
      FIRST_NAME: "field_5736",
      LAST_NAME: "field_5737",
      HEADSHOT: "field_5776",
      STATUS: "field_5782",
      PHONE: "field_5783",
      EMAIL_NATIONAL: "field_6131",
      EMAIL_PERSONAL: "field_6132",
      PARENT_1: "field_5779",
      PARENT_2: "field_5780",
      ASSIGNMENTS: "field_5788",
      BIO_ORIGINAL: "field_5821",
      BIO_EDITED: "field_5822",
      CONFLICTS: "field_5990",
      AUDITIONS: "field_6054",
    },
  },
  ASSIGNMENTS: {
    ID: "603",
    FIELDS: {
      ASSIGNMENT_LABEL: "field_5785",
      PERSON: "field_5786",
      PRODUCTION: "field_5787",
      ROLE: "field_5796", // Performance Identity
      SCENES: "field_6042", // Scene Assignments
    },
  },
  ROLES: {
    ID: "605",
    FIELDS: {
      NAME: "field_5791",
      TYPE: "field_5792",
      CONSTRAINTS: "field_5793",
      CAST_ASSIGNMENTS: "field_5797",
      ACTIVE_SCENES: "field_6077",
    },
  },
  SCENES: {
    ID: "627",
    FIELDS: {
      NAME: "field_6022",
      PRODUCTION: "field_6023",
      ACT: "field_6025",
      SIZE: "field_6026",
      TYPE: "field_6030",
      CAST_ASSIGNMENTS: "field_6041",
      ORDER: "field_6218",
      
      // Status & Loads
      MUSIC_STATUS: "field_6219",
      DANCE_STATUS: "field_6220",
      BLOCK_STATUS: "field_6221",
      MUSIC_LOAD: "field_6222",
      DANCE_LOAD: "field_6223",
      BLOCKING_LOAD: "field_6224",
      
      PAGES: "field_6226",
      
      // Links
      EVENTS: "field_6228",
      SLOTS: "field_6234",
    },
  },
  AUDITIONS: {
    ID: "630",
    FIELDS: {
      PERFORMER: "field_6052",
      PRODUCTION: "field_6053",
      DATE: "field_6061",
      SONG: "field_6062",
      MONOLOGUE: "field_6063",
      
      // Scores
      VOCAL_SCORE: "field_6056",
      ACTING_SCORE: "field_6057",
      DANCE_SCORE: "field_6059",
      STAGE_PRESENCE: "field_6058",
      
      // Notes
      ACTING_NOTES: "field_6060",
      CHOREO_NOTES: "field_6073",
      MUSIC_NOTES: "field_6074",
      ADMIN_NOTES: "field_6076",
      
      // Media
      VIDEO: "field_6082",
      DANCE_VIDEO: "field_6084",
      
      CALLBACKS: "field_6068", 
    },
  },
  PRODUCTIONS: {
    ID: "600",
    FIELDS: {
      TITLE: "field_5743",
      SEASON: "field_5742",
      IS_ACTIVE: "field_6083", 
      WORKFLOW_OVERRIDES: "field_6225",
    }
  },
  EVENTS: {
    ID: "625", // "Rehearsal/Production Events"
    FIELDS: {
      PRODUCTION: "field_6007",
      DATE: "field_6008",
      START_TIME: "field_6010",
      END_TIME: "field_6011",
      EVENT_TYPE: "field_6012",
      SCENES: "field_6227",
      SLOTS: "field_6232",
    }
  },
  SLOTS: {
    ID: "640", // "Schedule Slots"
    FIELDS: {
      EVENT_LINK: "field_6230",
      SCENE: "field_6233",
      TRACK: "field_6235",
      START_TIME: "field_6236", // Note: This is a DATE field in Baserow
      DURATION: "field_6238",
    }
  }
};