import { cookies } from 'next/headers';
import { getPeople } from '@/app/lib/baserow';
import { MOCK_CLASSES } from '../../lib/mockEducation';
import ClassManager from '@/app/components/education/ClassManager';

export default async function EducationPage() {
  const people = await getPeople();

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <ClassManager classes={MOCK_CLASSES} people={people} />
    </main>
  );
}