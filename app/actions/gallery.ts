"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { requireStaffAccess } from "@/app/lib/auth-guard";

export interface GalleryItem {
  id: number;
  name: string;
  url: string;
  type: string;
}

export async function addGalleryPhotoAction(
  tenant: string,
  productionId: number,
  payload: { name: string; url: string; type?: string; setAsCover?: boolean }
): Promise<{ ok: boolean; item?: GalleryItem; error?: string }> {
  const authCheck = await requireStaffAccess();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (!isPostgresEnabled()) {
    return { ok: false, error: "PostgreSQL is not configured." };
  }

  const cleanUrl = payload.url?.trim();
  const cleanName = payload.name?.trim() || "Production Photo";
  const cleanType = payload.type?.trim() || "Photo";

  if (!cleanUrl || !cleanUrl.startsWith("https://")) {
    return { ok: false, error: "Invalid image URL." };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { ok: false, error: "Organization not found." };

  const db = getDb();
  const [prod] = await db
    .select({ id: schema.productions.id })
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, org.id),
        eq(schema.productions.id, productionId)
      )
    )
    .limit(1);

  // Also allow matching by baserowId
  const targetProd =
    prod ||
    (
      await db
        .select({ id: schema.productions.id })
        .from(schema.productions)
        .where(
          and(
            eq(schema.productions.organizationId, org.id),
            eq(schema.productions.baserowId, productionId)
          )
        )
        .limit(1)
    )[0];

  if (!targetProd) {
    return { ok: false, error: "Production not found." };
  }

  const [inserted] = await db
    .insert(schema.assets)
    .values({
      organizationId: org.id,
      productionId: targetProd.id,
      name: cleanName,
      url: cleanUrl,
      type: cleanType,
    })
    .returning();

  if (payload.setAsCover) {
    await db
      .update(schema.productions)
      .set({ showImageUrl: cleanUrl, updatedAt: new Date() })
      .where(eq(schema.productions.id, targetProd.id));
  }

  revalidatePath("/", "layout");

  return {
    ok: true,
    item: {
      id: inserted.id,
      name: inserted.name,
      url: inserted.url || cleanUrl,
      type: inserted.type || cleanType,
    },
  };
}

export async function deleteGalleryPhotoAction(
  tenant: string,
  assetId: number
): Promise<{ ok: boolean; error?: string }> {
  const authCheck = await requireStaffAccess();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (!isPostgresEnabled()) {
    return { ok: false, error: "PostgreSQL is not configured." };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { ok: false, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.assets)
    .where(
      and(
        eq(schema.assets.organizationId, org.id),
        eq(schema.assets.id, assetId)
      )
    );

  revalidatePath("/", "layout");
  return { ok: true };
}
