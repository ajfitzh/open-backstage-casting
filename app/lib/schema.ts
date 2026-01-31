// app/lib/schema.ts

// --------------------------------------------------------
// 🚨 AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
//    Run `python3 get-schema.py` to update.
// --------------------------------------------------------

export const DB = {
  PEOPLE: {
    ID: "599",
    FIELDS: {
      FULL_NAME: "field_5735", // formula
      FIRST_NAME: "field_5736", // text
      LAST_NAME: "field_5737", // text
      DATE_OF_BIRTH: "field_5738", // date
      AGE: "field_5739", // formula
      GENDER: "field_5775", // single_select
      HEADSHOT: "field_5776", // file
      HEIGHT_TOTAL_INCHES: "field_5777", // number
      HEIGHT_FORMATTED: "field_5778", // formula
      PARENT_GUARDIAN_1: "field_5779", // link_row
      PARENT_GUARDIAN_2: "field_5780", // link_row
      PARENT_GUARDIAN_3: "field_5781", // link_row
      STATUS: "field_5782", // multiple_select
      PHONE_NUMBER: "field_5783", // phone_number
      CAST_CREW_ASSIGNMENTS: "field_5788", // link_row
      SIGNED_DOC_TYPES: "field_5815", // lookup
      SIGNATURES_VERIFIED_CAST_MEMBER: "field_5816", // link_row
      COMMITMENT_STATUS: "field_5817", // formula
      ORIGINAL_BIO: "field_5821", // lookup
      EDITED_BIO_FOR_PROGRAM: "field_5822", // long_text
      BIO_LENGTH_CHECK: "field_5823", // formula
      CURRENT_SHOWS: "field_5824", // lookup
      BIO_STATUS: "field_5825", // formula
      ATTENDANCE_STATUS: "field_5826", // single_select
      TOTAL_STATUS: "field_5827", // formula
      PRODUCTION_STATISTICS: "field_5832", // link_row
      ROLES_POSITIONS: "field_5845", // link_row
      SHOW_TEAM_ASSIGNMENTS: "field_5850", // link_row
      MEASUREMENTS: "field_5896", // link_row
      FORM_STUDENT_BIO: "field_5934", // link_row
      REHEARSAL_ATTENDANCE: "field_5977", // link_row
      REHEARSAL_ATTENDANCE_CHECKED_IN_BY: "field_5985", // link_row
      REHEARSAL_CONFLICTS: "field_5990", // link_row
      SCENE_ASSIGNMENTS: "field_6034", // link_row
      AUDITIONS: "field_6054", // link_row
      DIGITAL_ID: "field_6102", // autonumber
      FORM_COMMITTEE_PREFERENCES: "field_6100", // link_row
      CLASSES: "field_6123", // link_row
      CYT_NATIONAL_USER_ID: "field_6128", // text
      CYT_NATIONAL_FAMILY_ACCOUNT: "field_6129", // text
      CYT_NATIONAL_FAMILY_EMAIL: "field_6130", // text
      CYT_NATIONAL_INDIVIDUAL_EMAIL: "field_6131", // email
      CYT_ACCOUNT_PERSONAL_EMAIL: "field_6132", // email
      ADDRESS: "field_6133", // text
      SECONDARY_ADDRESS: "field_6134", // text
      CITY: "field_6135", // text
      STATE: "field_6136", // text
      ZIPCODE: "field_6137", // text
      TYLENOL_APPROVAL: "field_6138", // boolean
      IBUPROFEN_APPROVAL: "field_6139", // boolean
      MEDICAL_NOTES: "field_6140", // text
      MEDICAL_PROVIDER: "field_6141", // text
      MEDICAL_INSURANCE: "field_6142", // text
      MEDICAL_PHONE: "field_6143", // phone_number
      EMERGENCY_CONTACT_NAME: "field_6144", // text
      EMERGENCY_CONTACT_PHONE: "field_6145", // phone_number
      SCHOOL: "field_6146", // text
      PLACE_OF_WORSHIP: "field_6147", // text
      FRIEND_REQUEST: "field_6148", // text
      T_SHIRT_SIZE: "field_6149", // text
      CLASSES_STUDENTS: "field_6151", // link_row
      FAMILIES: "field_6153", // link_row
      APP_PASSWORD: "field_6195", // text
    }
  },
  PRODUCTIONS: {
    ID: "600",
    FIELDS: {
      FULL_TITLE: "field_5741", // formula
      SEASON: "field_5742", // single_select
      TITLE: "field_5743", // text
      SESSION: "field_5744", // single_select
      TYPE: "field_5745", // single_select
      STATUS: "field_5746", // single_select
      CASTING_ROLES: "field_5764", // text
      CASTING_ROLES_LINK: "field_5766", // text
      MASTER_SHOW_DATABASE: "field_5774", // link_row
      CAST_CREW_ASSIGNMENTS: "field_5789", // link_row
      SIGNATURES: "field_5807", // link_row
      SHOW_TEAM_ASSIGNMENTS: "field_5853", // link_row
      FORM_STUDENT_BIO: "field_5936", // link_row
      FORM_COMMITTEE_PREFERENCES: "field_5954", // link_row
      REHEARSAL_ATTENDANCE: "field_5978", // link_row
      REHEARSAL_CONFLICTS: "field_5991", // link_row
      REHEARSAL_REQUIREMENTS: "field_6001", // link_row
      PRODUCTION_EVENTS: "field_6009", // link_row
      SCENES: "field_6024", // link_row
      SCENE_ASSIGNMENTS: "field_6037", // link_row
      AUDITIONS: "field_6055", // link_row
      IS_ACTIVE: "field_6083", // formula
      PRODUCTION_RESOURCES: "field_6089", // link_row
      DIGITAL_ID: "field_6101", // autonumber
      LOCATION: "field_6105", // single_select
      SESSIONS: "field_6113", // link_row
      TICKET_PRICE_STANDARD: "field_6170", // number
      TICKET_PRICE_AT_DOOR: "field_6171", // number
      PRODUCTION_FEE: "field_6175", // number
      SHOW_IMAGE: "field_6176", // file
      PERFORMANCES: "field_6177", // long_text
      CAST_LIST_HTML: "field_6178", // long_text
      ALLOW_RESELLERS: "field_6179", // boolean
      VENUE: "field_6180", // link_row
      PERFORMANCES_PRODUCTION: "field_6188", // link_row
      HISTORICAL_CAST_SIZE: "field_6194", // number
    }
  },
  MASTER_SHOW_DB: {
    ID: "601",
    FIELDS: {
      COMPLETE_TITLE: "field_5767", // formula
      SHOW_TITLE: "field_5769", // text
      PRODUCTION_HISTORY: "field_5770", // link_row
      TIMES_PRODUCED: "field_5771", // rollup
      SHOWS: "field_5772", // lookup
      LICENSOR: "field_5773", // text
      BLUEPRINT_ROLES: "field_5795", // link_row
      MINIMUM_CAST: "field_6189", // number
      MAXIMUM_CAST: "field_6190", // number
      VOCAL_DIFFICULTY: "field_6191", // rating
      ROYALTY_ESTIMATE: "field_6192", // number
      BRAND_STRENGTH: "field_6193", // number
    }
  },
  ASSIGNMENTS: {
    ID: "603",
    FIELDS: {
      ASSIGNMENT: "field_5785", // formula
      PERSON: "field_5786", // link_row
      PRODUCTION: "field_5787", // link_row
      PERFORMANCE_IDENTITY: "field_5796", // link_row
      REHEARSAL_REQUIREMENTS: "field_6004", // link_row
      SCENE_ASSIGNMENTS: "field_6042", // link_row
    }
  },
  BLUEPRINT_ROLES: {
    ID: "605",
    FIELDS: {
      ROLE_NAME: "field_5791", // text
      ROLE_TYPE: "field_5792", // text
      CASTING_CONSTRAINTS: "field_5793", // single_select
      MASTER_SHOW_DATABASE: "field_5794", // link_row
      CAST_CREW_ASSIGNMENTS: "field_5797", // link_row
      ACTIVE_SCENES: "field_6077", // link_row
      SCENES: "field_6079", // lookup
    }
  },
  SIGNATURES: {
    ID: "607",
    FIELDS: {
      SIGNATURE_KEY: "field_5801", // formula
      PARENT_SIGNER_NAME: "field_5803", // text
      SIGNER_EMAIL: "field_5804", // email
      DOC_TYPE: "field_5805", // single_select
      PRODUCTION: "field_5806", // link_row
      INITIALS_DIGITAL_SIG: "field_5808", // text
      TIMESTAMP: "field_5809", // date
      VERIFIED_CAST_MEMBER: "field_5810", // link_row
      DOC_TYPE_TEXT: "field_5818", // formula
      PERFORMER_BIO: "field_5819", // long_text
      CONGRATS_AD: "field_5820", // long_text
    }
  },
  PROD_STATS: {
    ID: "608",
    FIELDS: {
      SHOW_NAME: "field_5828", // text
      TOTAL_CAST: "field_5829", // link_row
      START_DATE_FIRST_REHEARSAL: "field_5830", // date
      OPENING_NIGHT: "field_5831", // date
      REHEARSAL_PROGRESS: "field_5833", // formula
      TECH_WEEK_START: "field_5834", // date
      CLOSING_NIGHT: "field_5835", // date
      DAYS_UNTIL_OPENING_NIGHT: "field_5836", // formula
      CAST_COUNT: "field_5837", // count
    }
  },
  STAFF_POSITIONS: {
    ID: "609",
    FIELDS: {
      ROLE_NAME: "field_5840", // text
      DEPARTMENT: "field_5841", // single_select
      PEOPLE: "field_5846", // link_row
      SHOW_TEAM_ASSIGNMENTS: "field_5851", // link_row
    }
  },
  SHOW_TEAM: {
    ID: "610",
    FIELDS: {
      ASSIGNMENT: "field_5847", // formula
      PERSON: "field_5848", // link_row
      POSITION: "field_5849", // link_row
      PRODUCTIONS: "field_5852", // link_row
      STATUS: "field_5854", // single_select
    }
  },
  MEASUREMENTS: {
    ID: "616",
    FIELDS: {
      MEASUREMENT_ID: "field_5893", // formula
      PERSON: "field_5894", // link_row
      DATE: "field_5895", // date
      HEIGHT: "field_5897", // number
      CHEST: "field_5898", // number
      WAIST: "field_5899", // number
      HIPS: "field_5900", // number
      INSEAM: "field_5901", // number
      GIRTH: "field_5902", // number
      NECK: "field_5903", // number
      HAT_HEAD: "field_5904", // number
      SHOE_SIZE: "field_5905", // number
      GLOVE_SIZE: "field_5920", // single_select
    }
  },
  GARMENT_INVENTORY: {
    ID: "617",
    FIELDS: {
      DIGITAL_ID: "field_5921", // uuid
      GARMENT_ID: "field_5906", // formula
      PHOTO: "field_5907", // file
      CATEGORY: "field_5908", // single_select
      CHEST: "field_5909", // number
      WAIST: "field_5910", // number
      HIPS: "field_5911", // number
      INSEAM: "field_5912", // number
      BIN_LOCATION: "field_5913", // text
      QR_CODE_LINK: "field_5914", // formula
      GIRTH: "field_5915", // number
      NECK: "field_5916", // number
      HAT_HEAD: "field_5917", // number
      SHOE_SIZE: "field_5918", // number
      GLOVE_SIZE: "field_5919", // single_select
    }
  },
  STUDENT_BIO: {
    ID: "618",
    FIELDS: {
      DIGITAL_ID: "field_5964", // uuid
      STUDENT_FIRST_NAME: "field_5922", // text
      STUDENT_LAST_NAME: "field_5923", // text
      DATE_OF_BIRTH: "field_5924", // date
      PREFERRED_NAME: "field_5925", // text
      GUARDIAN_FIRST_NAME: "field_5926", // text
      GUARDIAN_LAST_NAME: "field_5927", // text
      GUARDIAN_EMAIL: "field_5928", // email
      GUARDIAN_PHONE: "field_5929", // phone_number
      PRIOR_CYT_EXPERIENCE: "field_5930", // long_text
      MEDICAL_NOTES: "field_5931", // long_text
      PROCESSED: "field_5932", // boolean
      LINKED_PERSON: "field_5933", // link_row
      PRODUCTION_SESSION: "field_5935", // link_row
    }
  },
  COMMITTEE_PREFS: {
    ID: "620",
    FIELDS: {
      DIGITAL_ID: "field_5950", // autonumber
      PRODUCTION: "field_5952", // link_row
      PRE_SHOW_1ST: "field_5955", // single_select
      SHOW_WEEK_1ST: "field_5956", // single_select
      CHAIR_INTEREST: "field_5958", // multiple_select
      NOTES_CONSTRAINTS: "field_5959", // long_text
      PROCESSED: "field_5960", // boolean
      PRE_SHOW_PHASE: "field_5961", // single_select
      SHOW_WEEK_COMMITTEES: "field_5962", // single_select
      PRE_SHOW_2ND: "field_6090", // single_select
      PRE_SHOW_3RD: "field_6091", // single_select
      SHOW_WEEK_2ND: "field_6092", // single_select
      SHOW_WEEK_3RD: "field_6093", // single_select
      DATE_OF_BIRTH: "field_6094", // date
      AGE: "field_6095", // formula
      PARENT_GUARDIAN_NAME: "field_6096", // text
      EMAIL: "field_6097", // email
      PHONE: "field_6098", // phone_number
      STUDENT_ID: "field_6099", // link_row
      STUDENT_NAME: "field_6103", // lookup
      PRODUCTION_NAME: "field_6104", // lookup
    }
  },
  ATTENDANCE: {
    ID: "622",
    FIELDS: {
      ATTENDANCE_ID: "field_5974", // uuid
      PERSON: "field_5975", // link_row
      PRODUCTION: "field_5976", // link_row
      CHECK_IN_TIME: "field_5981", // date
      CHECK_OUT_TIME: "field_5982", // date
      STATUS: "field_5983", // single_select
      CHECKED_IN_BY: "field_5984", // link_row
      NOTES: "field_5986", // text
      REHEARSAL_PRODUCTION_EVENTS: "field_6016", // link_row
    }
  },
  CONFLICTS: {
    ID: "623",
    FIELDS: {
      CONFLICT_ID: "field_5987", // formula
      PERSON: "field_5988", // link_row
      PRODUCTION: "field_5989", // link_row
      CONFLICT_TYPE: "field_5994", // single_select
      MINUTES_LATE_EARLY: "field_5995", // number
      SUBMITTED_VIA: "field_5996", // single_select
      NOTES: "field_5997", // long_text
      PRODUCTION_EVENT: "field_6070", // link_row
      DATE: "field_6072", // lookup
    }
  },
  REQUIREMENTS: {
    ID: "624",
    FIELDS: {
      REHEARSAL_REQUIREMENT_ID: "field_5998", // uuid
      PRODUCTION: "field_5999", // link_row
      ROLE_GROUP: "field_6003", // link_row
      REQUIRED: "field_6005", // boolean
    }
  },
  EVENTS: {
    ID: "625",
    FIELDS: {
      PRODUCTION_EVENT_ID: "field_6006", // autonumber
      PRODUCTION: "field_6007", // link_row
      EVENT_DATE: "field_6008", // date
      START_TIME: "field_6010", // date
      END_TIME: "field_6011", // date
      EVENT_TYPE: "field_6012", // single_select
      IS_REQUIRED: "field_6013", // boolean
      CONFLICT_ALLOWED: "field_6014", // boolean
      NOTES: "field_6015", // long_text
      REHEARSAL_PRODUCTION_ATTENDANCE: "field_6017", // link_row
      REHEARSAL_CONFLICTS: "field_6071", // link_row
    }
  },
  SCENES: {
    ID: "627",
    FIELDS: {
      SCENE_NAME_SHOW: "field_6021", // autonumber
      SCENE_NAME: "field_6022", // text
      PRODUCTION: "field_6023", // link_row
      ACT: "field_6025", // single_select
      SCENE_SIZE: "field_6026", // single_select
      MINIMUM_PERFORMERS: "field_6027", // number
      COUNTS_TOWARD_MINIMUM_SCENES: "field_6028", // boolean
      LOCATION: "field_6029", // text
      SCENE_TYPE: "field_6030", // single_select
      SCENE_ASSIGNMENTS: "field_6035", // link_row
      CAST_CREW_ASSIGNMENTS: "field_6041", // link_row
      BLUEPRINT_ROLES: "field_6078", // link_row
      // --- NEW FIELDS BELOW ---
      ORDER: "field_6218", // number
      MUSIC_STATUS: "field_6219", // single_select
      DANCE_STATUS: "field_6220", // single_select
      BLOCKING_STATUS: "field_6221", // single_select
      MUSIC_LOAD: "field_6222", // number
      DANCE_LOAD: "field_6223", // number
      BLOCKING_LOAD: "field_6224", // number
    }
  },
  SCENE_ASSIGNMENTS: {
    ID: "628",
    FIELDS: {
      SLOT_ID: "field_6031", // formula
      PERSON: "field_6032", // link_row
      SCENE: "field_6033", // link_row
      PRODUCTION: "field_6036", // link_row
      COUNTS_TOWARD_MINIMUM: "field_6038", // boolean
      NOTES_OPTIONAL: "field_6039", // long_text
      SLOT_TYPE: "field_6040", // single_select
    }
  },
  AUDITIONS: {
    ID: "630",
    FIELDS: {
      AUDITION_ID: "field_6051", // formula
      PERFORMER: "field_6052", // link_row
      PRODUCTION: "field_6053", // link_row
      VOCAL_SCORE: "field_6056", // number
      ACTING_SCORE: "field_6057", // number
      STAGE_PRESENCE_SCORE: "field_6058", // number
      DANCE_SCORE: "field_6059", // number
      ACTING_NOTES: "field_6060", // long_text
      DATE: "field_6061", // date
      SONG: "field_6062", // text
      MONOLOGUE: "field_6063", // text
      HEADSHOT: "field_6064", // lookup
      AGE: "field_6065", // lookup
      HEIGHT: "field_6066", // lookup
      BIRTHDATE: "field_6067", // lookup
      CONFLICTS: "field_6068", // lookup
      PAST_PRODUCTIONS: "field_6069", // lookup
      CHOREOGRAPHY_NOTES: "field_6073", // long_text
      MUSIC_NOTES: "field_6074", // long_text
      DROP_IN_NOTES: "field_6075", // long_text
      ADMIN_NOTES: "field_6076", // long_text
      GENDER: "field_6080", // lookup
      VOCAL_RANGE: "field_6081", // single_select
      AUDITION_VIDEO: "field_6082", // file
      DANCE_VIDEO: "field_6084", // url
      COMMITMENT_TO_CHARACTER: "field_6106", // boolean
      PAID_FEES: "field_6107", // boolean
      MEASUREMENTS_TAKEN: "field_6108", // boolean
    }
  },
  ASSETS: {
    ID: "631",
    FIELDS: {
      NAME: "field_6085", // text
      LINK: "field_6086", // url
      TYPE: "field_6087", // single_select
      PRODUCTION: "field_6088", // link_row
    }
  },
  SESSIONS: {
    ID: "632",
    FIELDS: {
      SESSION_NAME: "field_6109", // text
      START_DATE: "field_6110", // text
      END_DATE: "field_6111", // text
      IS_ACTIVE: "field_6112", // text
      PRODUCTIONS: "field_6114", // link_row
      CLASSES: "field_6122", // link_row
      RENTAL_RATES: "field_6214", // link_row
    }
  },
  CLASSES: {
    ID: "633",
    FIELDS: {
      FULL_CLASS_NAME: "field_6124", // formula
      CLASS_NAME: "field_6115", // text
      SESSION: "field_6116", // link_row
      TEACHER: "field_6117", // link_row
      LOCATION: "field_6118", // single_select
      DAY: "field_6119", // single_select
      TIME_SLOT: "field_6120", // single_select
      AGE_RANGE: "field_6121", // single_select
      STUDENTS: "field_6150", // link_row
      SPACE: "field_6196", 
      TYPE: "field_6217",// link_row
    }
  },
  FAMILIES: {
    ID: "634",
    FIELDS: {
      FAMILY: "field_6125", // formula
      EMAIL: "field_6126", // email
      CYT_NATIONAL_ID: "field_6127", // number
      MEMBERS: "field_6152", // link_row
    }
  },
  VENUES: {
    ID: "635",
    FIELDS: {
      VENUE_NAME: "field_6154", // text
      CHAPTERS: "field_6155", // text
      SEATING_CAPACITY: "field_6156", // number
      LOCATION_NOTES: "field_6157", // long_text
      ADDRESS: "field_6158", // text
      SEATING_CHART: "field_6159", // file
      SEATS: "field_6163", // link_row
      PUBLIC_NAME_MARKETING: "field_6169", // text
      PRODUCTIONS: "field_6181", // link_row
      TYPE: "field_6197", // single_select
      CONTACT_NAME: "field_6198", // text
      SPACES: "field_6203", // link_row
      RENTAL_RATES: "field_6210", // link_row
    }
  },
  SEATS: {
    ID: "636",
    FIELDS: {
      SEAT_ID: "field_6160", // formula
      VENUE: "field_6161", // link_row
      SECTION: "field_6162", // single_select
      ROW_LABEL: "field_6164", // text
      SEAT_NUMBER: "field_6165", // number
      STATUS: "field_6166", // single_select
      GRID_X: "field_6167", // number
      GRID_Y: "field_6168", // number
    }
  },
  PERFORMANCES: {
    ID: "637",
    FIELDS: {
      PERFORMANCE: "field_6182", // formula
      TOTAL_INVENTORY: "field_6183", // number
      TICKETS_SOLD: "field_6184", // number
      SOLD_PERCENT: "field_6185", // formula
      DATE: "field_6186", // date
      PRODUCTION: "field_6187", // link_row
    }
  },
  SPACES: {
    ID: "638",
    FIELDS: {
      FULL_ROOM_NAME: "field_6200", // formula
      VENUE: "field_6201", // link_row
      CAPACITY: "field_6202", // number
      FLOOR_TYPE: "field_6204", // single_select
      SQUARE_FOOTAGE: "field_6205", // number
      CLASSES: "field_6215", // link_row
      ROOM_NAME: "field_6216", // text
    }
  },
  RENTAL_RATES: {
    ID: "639",
    FIELDS: {
      NAME: "field_6207", // text
      VENUE: "field_6208", // link_row
      FLAT_RATE: "field_6209", // number
      HOURLY_RATE: "field_6211", // number
      WEEKEND_RATE: "field_6212", // number
      SESSION: "field_6213", // link_row
    }
  },
};