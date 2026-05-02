"use server"

import { revalidatePath } from 'next/cache';
import { getTenantTableConfig } from '@/app/lib/tenant-config';
import { DB } from '@/app/lib/schema'; // 🟢 Added Schema Import

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;

export async function saveCommitteeAssignments(
    tenant: string,
    phase: 'Pre-Show' | 'Show Week',
    assignments: Record<number, string>,
    chairs: Record<number, boolean> 
) {
    // 🟢 1. THE DRY RUN INTERCEPT (Safe testing mode)
    // ⚠️ COMMENT THIS OUT when you are ready to actually write to the database!
    if (process.env.NODE_ENV === "development") {
        console.log(`\n💾 --- DRY RUN SAVE: ${phase} ---`);
        console.log(`🏢 Tenant: ${tenant}`);
        
        // Let's see exactly what the UI is trying to send to the database
        const payloadChanges = Object.keys(assignments).map(id => ({
            personId: id,
            assignedTo: assignments[Number(id)],
            isChair: chairs[Number(id)] || false
        }));
        
        console.log("📦 Payload Snapshot (First 5):", payloadChanges.slice(0, 5), "... (truncated)");
        
        // Fake a 1.5-second network delay so you can see the UI loading spinner
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log("✅ Dry run complete. Aborting real database write.");
        
        // Return early so we DON'T actually write to Baserow
        return { success: true }; 
    }


    // 🟢 2. REAL DATABASE WRITE
    const tables = await getTenantTableConfig(tenant); // Ensure this is awaited!
    const tableId = tables.COMMITTEE_PREFS;
    const F = DB.COMMITTEE_PREFS.FIELDS;
    
    // STRICT TYPING: Map the phase to the exact field_XXXX ID
    const fieldId = phase === 'Pre-Show' ? F.PRE_SHOW_PHASE : F.SHOW_WEEK_COMMITTEES;

    const updates = Object.entries(assignments).map(([id, value]) => {
        // 🟢 Removed ?user_field_names=true since we are using strict IDs
        return fetch(`${BASE_URL}/api/database/rows/table/${tableId}/${id}/`, {
            method: 'PATCH',
            headers: {
                "Authorization": `Token ${API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                [fieldId]: value === "Unassigned" ? null : value,
                [F.IS_CHAIR]: chairs[Number(id)] || false 
            })
        });
    });

    await Promise.all(updates);
    
    // Revalidate the Next.js cache so the page instantly reflects the new data
    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return { success: true };
}