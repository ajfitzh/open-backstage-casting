import { cookies } from "next/headers";
import { getActiveProduction, getShowById } from "@/app/lib/baserow";

export interface SelectedProductionResult {
  show: any | null;
  defaultActiveShow: any | null;
  isViewingHistorical: boolean;
}

/**
 * Resolves the currently selected production for a tenant by checking the
 * `active_production_id` cookie first (verifying it exists in this tenant),
 * and falling back to the tenant's default active production.
 */
export async function getSelectedProduction(
  tenant: string
): Promise<SelectedProductionResult> {
  const [cookieStore, defaultActiveShow] = await Promise.all([
    cookies(),
    getActiveProduction(tenant),
  ]);

  const rawCookie = cookieStore.get("active_production_id")?.value;
  const cookieId = rawCookie ? Number(rawCookie) : NaN;

  if (Number.isInteger(cookieId) && cookieId > 0) {
    if (defaultActiveShow && Number(defaultActiveShow.id) === cookieId) {
      return {
        show: defaultActiveShow,
        defaultActiveShow,
        isViewingHistorical: false,
      };
    }

    const selectedShow = await getShowById(tenant, cookieId).catch(() => null);
    if (selectedShow) {
      const isHistorical =
        !selectedShow.isActive &&
        selectedShow.status !== "Active" &&
        selectedShow.status !== "Upcoming" &&
        selectedShow.status !== "Pre-Production";
      return {
        show: selectedShow,
        defaultActiveShow,
        isViewingHistorical: isHistorical,
      };
    }
  }

  return {
    show: defaultActiveShow,
    defaultActiveShow,
    isViewingHistorical: false,
  };
}
