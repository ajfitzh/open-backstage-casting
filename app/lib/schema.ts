// app/lib/schema.ts

export const DB = {
  PEOPLE: {
    ID: "599",
    FIELDS: {
      FULL_NAME: "field_5735",
      FIRST_NAME: "field_5736",
      LAST_NAME: "field_5737",
      HEADSHOT: "field_5776",
      STATUS: "field_5782",
      PHONE_NUMBER: "field_5783",
      CYT_NATIONAL_INDIVIDUAL_EMAIL: "field_6131",
      CYT_ACCOUNT_PERSONAL_EMAIL: "field_6132",
      PARENT_1: "field_5779",
      PARENT_2: "field_5780",
      CAST_CREW_ASSIGNMENTS: "field_5788",
      BIO_ORIGINAL: "field_5821",
      BIO_EDITED: "field_5822",
      CONFLICTS: "field_5990",
      AUDITIONS: "field_6054",
      AGE: "field_5739",
      HEIGHT_TOTAL_INCHES: "field_5777",
      GENDER: "field_5775",
      SHOW_TEAM: "field_5850",
      CLASSES: "field_6123",
      CLASSES_STUDENTS: "field_6151",
      MEDICAL_NOTES: "field_6140",
      ADDRESS: "field_6133",
      CITY: "field_6135",
      FAMILIES: "field_6153"
    },
  },
  ASSIGNMENTS: {
    ID: "603",
    FIELDS: {
      ASSIGNMENT: "field_5785",
      PERSON: "field_5786",
      PRODUCTION: "field_5787",
      PERFORMANCE_IDENTITY: "field_5796",
      SCENE_ASSIGNMENTS: "field_6042",
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
  // Alias for code that uses BLUEPRINT_ROLES
  BLUEPRINT_ROLES: {
    ID: "605",
    FIELDS: {}
  },
  SCENES: {
    ID: "627",
    FIELDS: {
      SCENE_NAME: "field_6022",
      PRODUCTION: "field_6023",
      ACT: "field_6025",
      SCENE_SIZE: "field_6026",
      SCENE_TYPE: "field_6030",
      CAST_ASSIGNMENTS: "field_6041",
      ORDER: "field_6218",
      MUSIC_STATUS: "field_6219",
      DANCE_STATUS: "field_6220",
      BLOCKING_STATUS: "field_6221",
      MUSIC_LOAD: "field_6222",
      DANCE_LOAD: "field_6223",
      BLOCKING_LOAD: "field_6224",
      PAGES: "field_6226",
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
      VOCAL_SCORE: "field_6056",
      ACTING_SCORE: "field_6057",
      DANCE_SCORE: "field_6059",
      STAGE_PRESENCE_SCORE: "field_6058",
      ACTING_NOTES: "field_6060",
      CHOREOGRAPHY_NOTES: "field_6073",
      MUSIC_NOTES: "field_6074",
      ADMIN_NOTES: "field_6076",
      DROP_IN_NOTES: "field_6075",
      HEADSHOT: "field_6064",
      AUDITION_VIDEO: "field_6082",
      DANCE_VIDEO: "field_6084",
      CALLBACKS: "field_6068",
      AGE: "field_6065",
      HEIGHT: "field_6066",
      CONFLICTS: "field_6068",
      GENDER: "field_6080"
    },
  },
  PRODUCTIONS: {
    ID: "600",
    FIELDS: {
      TITLE: "field_5743",
      FULL_TITLE: "field_5741",
      SEASON: "field_5742",
      IS_ACTIVE: "field_6083", 
      STATUS: "field_5746",
      SHOW_IMAGE: "field_6176",
      LOCATION: "field_6105",
      VENUE: "field_6180",
      WORKFLOW_OVERRIDES: "field_6225",
    }
  },
  EVENTS: {
    ID: "625", 
    FIELDS: {
      PRODUCTION: "field_6007",
      EVENT_DATE: "field_6008",
      START_TIME: "field_6010",
      END_TIME: "field_6011",
      EVENT_TYPE: "field_6012",
      IS_REQUIRED: "field_6013",
      SCENES: "field_6227",
      SLOTS: "field_6232",
    }
  },
  SLOTS: {
    ID: "640", 
    FIELDS: {
      EVENT_LINK: "field_6230",
      SCENE: "field_6233",
      TRACK: "field_6235",
      START_TIME: "field_6236",
      DURATION: "field_6238",
    }
  },
  // --- MISSING TABLES ADDED BELOW ---
  CLASSES: {
    ID: "633",
    FIELDS: {
        CLASS_NAME: "field_6115",
        SESSION: "field_6116",
        TEACHER: "field_6117",
        LOCATION: "field_6118",
        SPACE: "field_6196",
        DAY: "field_6119",
        TIME_SLOT: "field_6120",
        TYPE: "field_6217",
        AGE_RANGE: "field_6121",
        STUDENTS: "field_6150"
    }
  },
  VENUES: {
    ID: "635",
    FIELDS: {
        VENUE_NAME: "field_6154",
        TYPE: "field_6197",
        CONTACT_NAME: "field_6198"
    }
  },
  SPACES: {
    ID: "638",
    FIELDS: {
        ROOM_NAME: "field_6216",
        FULL_ROOM_NAME: "field_6200",
        CAPACITY: "field_6202",
        FLOOR_TYPE: "field_6204",
        VENUE: "field_6201"
    }
  },
  RENTAL_RATES: {
    ID: "639",
    FIELDS: {
        VENUE: "field_6208",
        HOURLY_RATE: "field_6211",
        WEEKEND_RATE: "field_6212",
        FLAT_RATE: "field_6209"
    }
  },
  ASSETS: { // Called RESOURCES in Baserow
    ID: "631",
    FIELDS: {
        NAME: "field_6085",
        LINK: "field_6086",
        TYPE: "field_6087",
        PRODUCTION: "field_6088"
    }
  },
  SHOW_TEAM: {
    ID: "610",
    FIELDS: {
        PERSON: "field_5848",
        POSITION: "field_5849",
        PRODUCTIONS: "field_5852"
    }
  },
  COMMITTEE_PREFS: {
    ID: "620",
    FIELDS: {
        STUDENT_NAME: "field_6103",
        STUDENT_ID: "field_6099",
        PRE_SHOW_1ST: "field_5955",
        PRE_SHOW_2ND: "field_6090",
        SHOW_WEEK_1ST: "field_5956",
        SHOW_WEEK_2ND: "field_6092",
        EMAIL: "field_6097",
        PHONE: "field_6098",
        SHOW_WEEK_COMMITTEES: "field_5962",
        PRODUCTION: "field_5952"
    }
  },
  CONFLICTS: {
    ID: "623",
    FIELDS: {
        PRODUCTION: "field_5989",
        DATE: "field_6072",
        PERSON: "field_5988",
        CONFLICT_TYPE: "field_5994",
        MINUTES_LATE_EARLY: "field_5995",
        SUBMITTED_VIA: "field_5996",
        NOTES: "field_5997",
        PRODUCTION_EVENT: "field_6070"
    }
  },
  PERFORMANCES: {
    ID: "637",
    FIELDS: {
        TICKETS_SOLD: "field_6184",
        TOTAL_INVENTORY: "field_6183",
        PERFORMANCE: "field_6182"
    }
  }
};