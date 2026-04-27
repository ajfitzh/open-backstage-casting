"use server"

import { revalidatePath } from 'next/cache';

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;

export async function saveCommitteeAssignments(
    phase: 'Pre-Show' | 'Show Week',
    assignments: Record<number, string>
) {
    const fieldName = phase === 'Pre-Show' ? 'Pre-Show Phase' : 'Show Week Committees';

    // Update all changed rows in parallel
    const updates = Object.entries(assignments).map(([id, value]) => {
        return fetch(`${BASE_URL}/api/database/rows/table/620/${id}/?user_field_names=true`, {
            method: 'PATCH',
            headers: {
                "Authorization": `Token ${API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                [fieldName]: value === "Unassigned" ? null : value
            })
        });
    });

    await Promise.all(updates);
    
    // This tells Next.js to refresh the page data instantly
    revalidatePath('/(main)/(staff)/committees', 'page');
    return { success: true };
}