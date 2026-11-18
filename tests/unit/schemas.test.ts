import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserProfileSchema } from '../../app/lib/schemas/person.ts';
import { EventSchema, SlotSchema, ConflictSchema } from '../../app/lib/schemas/schedule.ts';
import { ClassSchema } from '../../app/lib/schemas/education.ts';
import {
  SceneSchema,
  RoleSchema,
  RosterStudentSchema,
  RosterListSchema,
  AssignmentSchema,
  CommitteePrefSchema,
} from '../../app/lib/schemas/casting.ts';

describe('UserProfileSchema', () => {
  it('extracts emails, role precedence, nested headshots, and address cleanly', () => {
    const profile = UserProfileSchema.parse({
      id: 42,
      'First Name': 'Jane',
      'Last Name': 'Doe',
      'Full Name': '',
      Status: [
        { id: 1, value: 'Parent/Guardian' },
        { id: 2, value: 'Admin' },
        { id: 3, value: 'Executive Director' },
      ],
      'CYT Account Personal Email': '',
      'CYT National Individual Email': 'jane@national.org',
      'Phone Number': '555-0100',
      Headshot: [[{ url: 'https://files.baserow.io/jane.jpg' }]],
      Address: '123 Stage St',
      City: '',
      Families: [{ id: 77, value: 'Doe Family' }],
      'App Password': '$2a$10$hashedpassword',
    });

    assert.equal(profile.id, '42');
    assert.equal(profile.name, 'Jane Doe');
    assert.equal(profile.email, 'jane@national.org');
    assert.equal(profile.role, 'Admin'); // Admin beats Executive Director & Parent/Guardian
    assert.deepEqual(profile.tags, ['Parent/Guardian', 'Admin', 'Executive Director']);
    assert.equal(profile.image, 'https://files.baserow.io/jane.jpg');
    assert.equal(profile.address, '123 Stage St');
    assert.equal(profile.familyId, 77);
    assert.equal(profile.appPassword, '$2a$10$hashedpassword');
  });

  it('defaults safely to Guest when optional fields are missing', () => {
    const profile = UserProfileSchema.parse({ id: 7, 'Full Name': 'Guest User' });
    assert.equal(profile.role, 'Guest');
    assert.deepEqual(profile.tags, ['Guest']);
    assert.equal(profile.email, '');
    assert.equal(profile.image, null);
    assert.equal(profile.familyId, null);
    assert.equal(profile.appPassword, null);
  });
});

describe('Schedule schemas (Event, Slot, Conflict)', () => {
  it('transforms EventSchema with defaults', () => {
    const ev = EventSchema.parse({ id: 10, 'Event Date': '2026-12-01' });
    assert.deepEqual(ev, {
      id: 10,
      date: '2026-12-01',
      startTime: '',
      endTime: '',
      type: 'Rehearsal',
      notes: '',
    });
  });

  it('unwraps nested lookup values in SlotSchema and ConflictSchema', () => {
    const slot = SlotSchema.parse({
      id: 101,
      'Event Link': [{ id: 10, value: 'Tue Rehearsal' }],
      Scene: [{ id: 5, value: { value: 'Act 1 Opening' } }],
      Track: { value: 'Music' },
      'Start Time': '17:00',
      'End Time': '18:00',
      Duration: '60',
    });

    assert.equal(slot.eventId, 10);
    assert.equal(slot.sceneId, 5);
    assert.equal(slot.sceneName, 'Act 1 Opening');
    assert.equal(slot.track, 'Music');
    assert.equal(slot.duration, 60);

    const conflict = ConflictSchema.parse({
      id: 202,
      Person: [{ id: 33, value: { value: 'Alex Actor' } }],
      'Production Event': [{ id: 10, value: 'Rehearsal 1' }],
      Date: [{ id: 1, value: { value: '2026-12-05' } }],
      'Conflict Type': { value: 'Late Arrival' },
      Notes: 'Soccer game',
    });

    assert.deepEqual(conflict, {
      id: 202,
      personId: 33,
      personName: 'Alex Actor',
      eventId: 10,
      date: '2026-12-05',
      type: 'Late Arrival',
      notes: 'Soccer game',
    });
  });
});

describe('ClassSchema (Education)', () => {
  it('formats age ranges for All Ages, minimum-only, and bounded ranges', () => {
    const allAges = ClassSchema.parse({ id: 1, 'Class Name': 'Improv', Students: [] });
    assert.equal(allAges.ageRange, 'All Ages');
    assert.equal(allAges.teacher, 'TBA');

    const teensPlus = ClassSchema.parse({
      id: 2,
      'Class Name': 'Advanced Tap',
      'Minimum Age': '13',
      Students: [{ id: 1, value: 'A' }, { id: 2, value: 'B' }],
    });
    assert.equal(teensPlus.ageRange, '13+');
    assert.equal(teensPlus.students, 2);

    const bounded = ClassSchema.parse({
      id: 3,
      'Class Name': 'Mini Musical',
      'Minimum Age': 6,
      'Maximum Age': 10,
      Teacher: [{ id: 9, value: { value: 'Ms. Rivera' } }],
      Space: [{ id: 4, value: 'Studio B' }],
    });
    assert.equal(bounded.ageRange, '6 - 10');
    assert.equal(bounded.teacher, 'Ms. Rivera');
    assert.equal(bounded.spaceId, 4);
    assert.equal(bounded.spaceName, 'Studio B');
  });
});

describe('Casting schemas (Scene, Role, Roster, Assignment, CommitteePref)', () => {
  it('parses SceneSchema loads and RoleSchema vocal requirements', () => {
    const scene = SceneSchema.parse({
      id: 50,
      'Scene Name': 'Under the Sea',
      Act: { value: '1' },
      'Scene Type': { value: 'Musical Number' },
      Order: '3',
      'Music Load': '5',
      'Dance Load': '4',
      'Blocking Load': '2',
    });
    assert.deepEqual(scene.load, { music: 5, dance: 4, block: 2 });
    assert.equal(scene.order, 3);

    const role = RoleSchema.parse({
      id: 60,
      'Role Name': 'Ariel',
      'Role Type': 'Lead',
      'Vocal Range': 'C4-A5',
      'Active Scenes': [{ id: 50, value: 'Under the Sea' }],
    });
    assert.equal(role.name, 'Ariel');
    assert.equal(role.vocalRequirements.voiceType, 'Soprano');
    assert.equal(role.vocalRequirements.lowInt, 60);
    assert.equal(role.vocalRequirements.highInt, 81);
  });

  it('transforms RosterStudentSchema & RosterListSchema with compliance and headshot flags', () => {
    const list = RosterListSchema.parse([
      {
        id: 900,
        Performer: [{ id: 12, value: 'Sam Singer' }],
        'Vocal Score': '4.5',
        'Acting Score': '4',
        'Dance Score': null,
        Gender: [{ id: 1, value: 'Female' }],
        Headshot: [{ url: 'https://files.baserow.io/sam.png' }],
        Status: { value: 'Called Back' },
        'Paid Fees': true,
        'Measurements Taken': false,
        'Commitment to Character': true,
        Grade: { value: '10th' },
        Height: "5'4\"",
        'Accept Any Role': true,
      },
    ]);

    assert.equal(list.length, 1);
    const student = list[0];
    assert.equal(student.id, 12);
    assert.equal(student.name, 'Sam Singer');
    assert.equal(student.status, 'Called Back');
    assert.equal(student.vocalScore, 4.5);
    assert.equal(student.danceScore, 0);
    assert.equal(student.auditionInfo.gender, 'Female');
    assert.equal(student.headshotSubmitted, true);
    assert.equal(student.paidFees, true);
    assert.equal(student.measurementsTaken, false);
    assert.equal(student.signedAgreement, true);
    assert.equal(student.grade, '10th');
  });

  it('uses placeholder avatar when RosterStudentSchema has no headshot', () => {
    const student = RosterStudentSchema.parse({ id: 901 });
    assert.equal(student.name, 'Unknown Actor');
    assert.equal(student.headshotSubmitted, false);
    assert.match(student.avatar, /placehold\.co/);
  });

  it('normalizes AssignmentSchema and CommitteePrefSchema nested lookups', () => {
    const assignment = AssignmentSchema.parse({
      id: 300,
      'Performance Identity': [{ id: 1, value: { value: 'Sebastian' } }],
      Person: [{ id: 2, value: 'Jordan' }],
      Production: [{ id: 94, value: 'Little Mermaid' }],
      'Scene Assignments': [{ id: 50, value: 'Under the Sea' }],
    });
    assert.equal(assignment.role[0].value, 'Sebastian');
    assert.equal(assignment.person[0].value, 'Jordan');

    const pref = CommitteePrefSchema.parse({
      id: 400,
      'Parent/Guardian Name': 'Pat Parent',
      Email: 'pat@example.com',
      Phone: '555-1212',
      'Student Name': [{ id: 12, value: { value: 'Sam Singer' } }],
      'Pre-Show 1st': { value: 'Costumes' },
      'Show Week 1st': { value: 'Backstage' },
    });
    assert.equal(pref.studentName, 'Sam Singer');
    assert.equal(pref.preShow1, 'Costumes');
    assert.equal(pref.showWeek1, 'Backstage');
    assert.equal(pref.preShow2, null);
  });
});
