import os
import requests
import urllib.parse
import pandas as pd
import difflib
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# --- CONFIGURATION ---
BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")

# Table IDs
TABLE_PEOPLE = "599"
TABLE_COMMITTEES = "620"

# --- FIELD ID MAPPING (Table 620: Committee Preferences) ---
F_STUDENT_LINK = "field_6099"
F_PARENT_LINK = "field_6096"
F_PRE_1 = "field_5955"
F_PRE_2 = "field_6090"
F_PRE_3 = "field_6091"
F_SHOW_1 = "field_5956"
F_SHOW_2 = "field_6092"
F_SHOW_3 = "field_6093"
F_CHAIR_MULTI = "field_5958"
F_NOTES = "field_5959"
F_PROCESSED = "field_5960"

# --- FIELD ID MAPPING (Table 599: People) ---
P_FIRST = "field_5736"
P_LAST = "field_5737"
P_EMAIL = "field_6132"
P_STATUS = "field_5782"

HEADERS = {
    "Authorization": f"Token {BASEROW_TOKEN}",
    "Content-Type": "application/json"
}

# --- HELPER FUNCTIONS ---

def split_name(full_name):
    parts = str(full_name).strip().split(' ', 1)
    return (parts[0], parts[1]) if len(parts) == 2 else (parts[0], "")

def clean_choice(val):
    """Standardizes strings to match Baserow Select Options exactly."""
    if not val or pd.isna(val): return None
    v = str(val).strip().lower()
    
    # Handle the variants
    if "ninga" in v: return "Ninjas/Set Movers"
    if "make" in v and "up" in v or v == "makeup": return "Makeup"
    if "green" in v and "room" in v or v == "greenroom": return "Green Room"
    
    # Capitalize the first letter of each word (e.g., "set dressing" -> "Set Dressing")
    return v.title()
def get_chair_ids(csv_val):
    """Maps CSV text to your specific Multiple Select Option IDs (field_5958)."""
    # Using the IDs you provided from your schema dump
    id_map = {
        "Publicity": 2959,
        "Sets": 2960,
        "Set Dressing": 2961,
        "Raffles": 3023,
        "Green Room": 3024,
        "Costumes": 3025,
        "Props": 3026,
        "Make-Up": 3027,
        "Hair": 3028,
        "Tech": 3029,
        "Maybe": 3104 # "Maybe - I'd like more info"
    }
    
    val = clean_choice(csv_val)
    if val in id_map:
        return [id_map[val]]
    return []

def get_or_create_person(full_name, email="", is_student=False):
    """Fuzzy searches for a person; creates them using Field IDs if not found."""
    encoded_search = urllib.parse.quote(full_name)
    url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_PEOPLE}/?user_field_names=true&search={encoded_search}"
    response = requests.get(url, headers=HEADERS)
    results = response.json().get('results', [])

    # Fuzzy check
    for row in results:
        db_name = row.get("Full Name", "").strip()
        if difflib.SequenceMatcher(None, full_name.lower(), db_name.lower()).ratio() > 0.80:
            return row['id']

    # Create using IDs
    first, last = split_name(full_name)
    payload = {
        P_FIRST: first,
        P_LAST: last,
        P_EMAIL: email,
        P_STATUS: ["Student"] if is_student else ["Parent/Guardian"]
    }
    # Note: Create endpoint doesn't need ?user_field_names when using field_XXXX keys
    res = requests.post(f"{BASEROW_URL}/api/database/rows/table/{TABLE_PEOPLE}/", headers=HEADERS, json=payload)
    if res.status_code >= 400:
        print(f"   [!] Failed to create {full_name}: {res.text}")
        return None
    return res.json()['id']

def upsert_committee_preference(parent_ids, student_ids, row):
    """Posts a new preference row using direct Field IDs."""
    
    # Check if we have a custom chair message vs a simple tag
    chair_val = str(row.get('Willing to Chair', '')).strip()
    chair_ids = get_chair_ids(chair_val)
    
    notes = str(row.get('Chair Notes', '')).strip()
    if chair_val and not chair_ids:
        # If they wrote a custom sentence, we save it to notes so it isn't lost
        notes = f"[Chair Interest: {chair_val}] {notes}"

    payload = {
        F_STUDENT_LINK: student_ids,
        F_PARENT_LINK: parent_ids,
        F_PRE_1: clean_choice(row.get('Pre-Show Choice 1')),
        F_PRE_2: clean_choice(row.get('Pre-Show Choice 2')),
        F_PRE_3: clean_choice(row.get('Pre-Show Choice 3')),
        F_SHOW_1: clean_choice(row.get('Show Choice 1')),
        F_SHOW_2: clean_choice(row.get('Show Choice 2')),
        F_SHOW_3: clean_choice(row.get('Show Choice 3')),
        F_CHAIR_MULTI: chair_ids,
        F_NOTES: notes,
        F_PROCESSED: False
    }

    url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_COMMITTEES}/"
    res = requests.post(url, headers=HEADERS, json=payload)
    
    if res.status_code in [200, 201]:
         print(f"   [✔] Record saved for {row.get('Parent Name')}")
    else:
         print(f"   [!] Save failed: {res.text}")

# --- MAIN ---
# --- RECOVERY MAIN ---
def main():
    try:
        df = pd.read_csv("real_committee_import.csv")
    except:
        print("CSV not found.")
        return

    # LIST OF FAILED PARENTS
    failed_parents = [
        "Taylor Buel", 
        "Laura Hill", 
        "Savannah Ridenour", 
        "Renee Turner", 
        "Leah Brown", 
        "Nikki Eaddy"
    ]

    # Filter the dataframe to only include the failures
    df_recovery = df[df['Parent Name'].isin(failed_parents)]
    
    print(f"Starting recovery run for {len(df_recovery)} failed records...")

    for index, row in df_recovery.iterrows():
        print(f"\n--- Recovery Row: {row['Parent Name']} ---")
        email = str(row['Email']).strip()
        
        p_ids = [get_or_create_person(n.strip(), email=email) for n in str(row['Parent Name']).split('|')]
        s_ids = [get_or_create_person(n.strip(), is_student=True) for n in str(row['Student Name']).split('|')]
        
        p_ids = [i for i in p_ids if i]
        s_ids = [i for i in s_ids if i]
        
        upsert_committee_preference(p_ids, s_ids, row)

if __name__ == "__main__":
    main()