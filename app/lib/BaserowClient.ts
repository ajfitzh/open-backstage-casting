import { z } from 'zod';
import { DB } from './schema';
import { UserProfileSchema, UserProfileListSchema } from './schemas/person';

// --- CONFIGURATION ---
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;
const HEADERS = {
  "Authorization": `Token ${API_TOKEN}`,
  "Content-Type": "application/json",
};

// --- GENERIC, VALIDATED FETCHER ---
async function fetchAndValidate<T extends z.ZodTypeAny>(
  endpoint: string,
  schema: T,
  options: RequestInit = {}
): Promise<z.infer<T> | null> {
  try {
    const finalUrl = `${BASE_URL}/api${endpoint}`;
    const res = await fetch(finalUrl, {
      ...options,
      headers: { ...HEADERS, ...options.headers },
      cache: "no-store", // Ensure fresh data for this critical layer
    });

    if (!res.ok) {
      console.error(`[BaserowClient] API Error ${res.status}: ${res.statusText} at ${finalUrl}`);
      return null;
    }
    
    const rawData = await res.json();
    const validationResult = schema.safeParse(rawData);

    if (!validationResult.success) {
      console.error("[BaserowClient] Zod Validation Error:", validationResult.error.flatten());
      return null;
    }

    return validationResult.data;

  } catch (error) {
    console.error("[BaserowClient] Network/Fetch Error:", error);
    return null;
  }
}

// --- NEW, VALIDATED USER FUNCTION ---
async function findUserByEmail(email: string) {
    const params = new URLSearchParams({
        filter_type: "OR",
        size: "1",
        [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
        [`filter__${DB.PEOPLE.FIELDS.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: email,
    });

    const endpoint = `/database/rows/table/${DB.PEOPLE.ID}/?${params.toString()}`;
    const result = await fetchAndValidate(endpoint, UserProfileListSchema);

    // The schema returns an array, so we return the first (and only) item
    return result?.[0] ?? null;
}

// --- EXPORT THE CLIENT ---
export const BaserowClient = {
  findUserByEmail,
};
