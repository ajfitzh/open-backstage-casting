"use server"

import { revalidatePath } from 'next/cache';
import { getTenantTableConfig } from '@/app/lib/tenant-config';

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;

export async function saveCommitteeAssignments(
    tenant: string,
    phase: 'Pre-Show' | 'Show Week',
    assignments: Record<number, string>,
    chairs: Record<number, boolean> 
) {
    // 1. Fetch dynamic Table ID based on tenant
    const tables = getTenantTableConfig(tenant);
    const tableId = tables.COMMITTEE_PREFS;
    
    const fieldName = phase === 'Pre-Show' ? 'Pre-Show Phase' : 'Show Week Committees';

    const updates = Object.entries(assignments).map(([id, value]) => {
        return fetch(`${BASE_URL}/api/database/rows/table/${tableId}/${id}/?user_field_names=true`, {
            method: 'PATCH',
            headers: {
                "Authorization": `Token ${API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                [fieldName]: value === "Unassigned" ? null : value,
                "Is Chair?": chairs[Number(id)] || false 
            })
        });
    });

    await Promise.all(updates);
    
    revalidatePath('/(main)/(staff)/committees', 'page');
    return { success: true };
}