// app/lib/baserow.ts

function safeGet(field: any, fallback: string = "Unknown"): string {
  if (field === undefined || field === null || field === "") return fallback;
  if (typeof field === 'string') return field.trim() || fallback;
  if (Array.isArray(field) && field.length > 0) return field[0].value || field[0].name || fallback;
  if (typeof field === 'object') return field.value || field.name || fallback;
  return fallback;
}

export async function getAllShows() {
  const data = await fetchBaserow(
    `/database/rows/table/${TABLES.PRODUCTIONS}/`, 
    {}, 
    { size: "200" } 
  );
  
  if (!Array.isArray(data)) return [];
  
  // Sort by ID newest first
  const sortedData = data.sort((a: any, b: any) => b.id - a.id);

  return sortedData.map((row: any) => {
    // We try THREE different fields for the title to be safe
    const rawTitle = row.Title || row["Full Title"] || row["Show Title"] || "";
    
    return {
      id: row.id,
      title: safeGet(rawTitle, "Untitled Show"),
      location: safeGet(row.Location || row.Venue || row.Branch),
      type: safeGet(row.Type, "Main Stage"),
      season: safeGet(row.Season, "Unknown Season"),
      isActive: row["Is Active"] === true || row["Is Active"]?.value === "true" || row.Status === "Active"
    };
  });
}