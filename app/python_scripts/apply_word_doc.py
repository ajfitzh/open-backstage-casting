import os
import requests
import difflib
from dotenv import load_dotenv

load_dotenv('.env.local')

BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")
TABLE_COMMITTEES = "620"

HEADERS = {
    "Authorization": f"Token {BASEROW_TOKEN}",
    "Content-Type": "application/json"
}

# --- JENNY'S WORD DOC DATA ---
PRE_SHOW_ASSIGNMENTS = {
    "Green Room": ["Heather Gudowicz", "Christine Garner", "Sharon Martinez", "Amanda Kosco", "Stephenie Chapman", "Andy Chapman", "Laura Hill", "Jason Hill"],
    "Sets": ["Tim Tabisz", "Scott Mersiovsky", "Zac Stevens", "Jim Furlo", "Kayla Cutler", "Kyle Cutler", "Rodney Gentry"],
    "Set Dressing": ["Allison Roach", "Gina McVicker", "Kristie Huray", "Adam Huray", "Michelle Bolte", "Jessica Whiteley", "Patrick Hansen", "Anna Hansen"],
    "Props": ["Sheri Burns", "Yennisse Alfaro", "Mary Walsh", "Heather Anderson", "Susan Simmons"],
    "Raffles": ["Michelle Harrison", "Suzie Medina", "Shauntae Foggie", "Christina Merideth", "Jay Merideth", "Francis Tao", "Julie Flanagan", "Pam Griffin"],
    "Publicity": ["Erika Patten-Miller", "Jennifer Erickson", "Abraham Erickson", "Sarah Miller", "Sandy Lawrence", "Mario Alfaro", "Jennifer Wielgoszinski", "Helen Jarrett", "Tammara Covert", "Tony Scott"],
    "Costumes": ["Jen Catelli", "Kristie Hunt", "Marnie Godfrey", "Amanda Reno", "Jennifer Manton", "Julissa Mena"],
    "Hair": ["Tiffany Jeffris", "Elizabeth Davis", "Leah Brown", "Shay Cupina", "Jonathan Cupina", "Ashley Barber"],
    "Makeup": ["Taylor Buel", "Renee Turner", "Nikki Eaddy"],
    "Tech": ["Travis Turner", "Ashley Green"]
}

SHOW_WEEK_ASSIGNMENTS = {
    "Security": ["Shay Cupina", "Jonathan Cupina"],
    "Box Office": ["Suzie Medina"],
    "Concessions": ["Allison Roach"]
}

# Flatten dicts for easy lookup: { "heather gudowicz": "Green Room" }
def flatten_assignments(assignment_dict):
    flat = {}
    for committee, people in assignment_dict.items():
        for person in people:
            flat[person.lower()] = committee
    return flat

pre_show_map = flatten_assignments(PRE_SHOW_ASSIGNMENTS)
show_week_map = flatten_assignments(SHOW_WEEK_ASSIGNMENTS)

def get_assignment(db_names, assignment_map):
    """Fuzzy match database names against Jenny's list."""
    for db_name in db_names:
        db_name_lower = db_name.lower()
        # Exact Match
        if db_name_lower in assignment_map:
            return assignment_map[db_name_lower]
        # Fuzzy Match
        for word_doc_name, committee in assignment_map.items():
            if difflib.SequenceMatcher(None, db_name_lower, word_doc_name).ratio() > 0.80:
                return committee
    return None

def main():
    print("Fetching current committee rows...")
    url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_COMMITTEES}/?user_field_names=true&size=200"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code >= 400:
        print("Error fetching data:", response.text)
        return
        
    rows = response.json().get('results', [])
    updated_count = 0
    
    for row in rows:
        row_id = row['id']
        parents = row.get("Parent/Guardian Name", [])
        parent_names = [p['value'] for p in parents]
        
        if not parent_names:
            continue
            
        # Determine Assignments
        pre_show_choice = get_assignment(parent_names, pre_show_map)
        show_week_choice = get_assignment(parent_names, show_week_map)
        
        # Check if Amy Filizetti (Show Chair)
        is_chair = any("amy filizetti" in name.lower() for name in parent_names)

        patch_data = {}
        if pre_show_choice:
            patch_data["Pre-Show Phase"] = pre_show_choice
        if show_week_choice:
            patch_data["Show Week Committees"] = show_week_choice
        if is_chair:
            current_notes = row.get("Notes/Constraints", "")
            patch_data["Notes/Constraints"] = f"[ASSIGNED: Show Chair] {current_notes}"
            
        if patch_data:
            print(f"Assigning {parent_names} -> {patch_data}")
            patch_url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_COMMITTEES}/{row_id}/?user_field_names=true"
            patch_res = requests.patch(patch_url, headers=HEADERS, json=patch_data)
            
            if patch_res.status_code in [200, 201, 204]:
                updated_count += 1
            else:
                print(f"  [!] Failed to update row {row_id}: {patch_res.text}")
                
    print(f"\nDone! Successfully assigned {updated_count} families based on Jenny's Word Doc.")

if __name__ == "__main__":
    main()