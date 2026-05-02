import os
import time
import requests
from dotenv import load_dotenv

# Load credentials
load_dotenv('.env.local')
BASE_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://api.baserow.io").rstrip("/")
TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")

# From your schema
TABLE_PEOPLE = 599
TABLE_PRODUCTIONS = 600
TABLE_ASSIGNMENTS = 603
TABLE_ROLES = 605

HEADERS = {
    "Authorization": f"Token {TOKEN}",
    "Content-Type": "application/json"
}

# The complete cast list
CAST_MAP = {
    "ariel": ["Madison Hill"],
    "prince eric": ["Trey Filizetti"],
    "ursula": ["Kendall Manton"],
    "flounder": ["Etta Moffitt"],
    "sebastian": ["Chance Hansen"],
    "scuttle": ["Miki Furlo"],
    "king triton": ["Josh Gentry"],
    "flotsam": ["Kyla Tabisz"],
    "jetsam": ["Barrett Tabisz"],
    "aquata": ["Adelynn Cook"],
    "andrina": ["Riley Hansen"],
    "arista": ["Sydney Harrison"],
    "atina": ["Mia Wielgoszinski"],
    "adella": ["Janiya Davis"],
    "allana": ["Abigail Burns"],
    "grimsby": ["Bret Miller"],
    "chef louis": ["Tie Eaddy"],
    "windward": ["William Jarrett"],
    "leeward": ["Carson Green"],
    "pilot": ["Jacob Hunt"],
    "ship pilot": ["Jacob Hunt"],
    "carlotta": ["Mary Jo Walsh"],
    
    "sailors": ["Bret Miller", "Elena Alfaro", "Gabe Miller", "Henry Mersiovsky", "Jacob Hunt", "James Reno", "Juliana Lawrence", "Kaelyn Shupe", "Lana Cupina", "Levi Mersiovsky", "Raegan Flanagan", "Trey Filizetti"],
    "gulls": ["Abby Griffin", "Ellie Chapman", "Miki Furlo", "Virginia Moffitt", "Caroline Davis", "Greta Godfrey", "Hazel Jarrett", "Imani Burrell", "Joanna Reno", "Katie Grace Alfaro", "Natalie Hill", "Ruby Covert"],
    "eel ensemble": ["Callie Corchado", "Dottie Felts", "Emma Simmons", "Harper Anderson", "Jocelyn Blake Bolte", "Olive McVicker", "Olivia Green", "Zoe Turner"],
    "chefs": ["Lydia Tao", "Adalynn Erickson", "Ellie Miller", "Aubree Garner", "Charlotte Roach", "Megan Scott", "Adrianna Barber", "Juliet Merideth", "Aife Catelli", "Audrey Davis", "Gisele Whiteley", "Luna Mena"],
    "princesses": ["Brielle Foggie", "Elsie Jane Adler", "Samantha Hunt", "Rhylie Kosco", "Emma Gudowicz", "Lizzy Jeffris", "Anistyn Shupe", "Ava Huray", "Kailea Davis", "Mila Medeiros"]
}

def get_production_info():
    print("🎬 Finding Production & Master Show IDs...")
    url = f"{BASE_URL}/api/database/rows/table/{TABLE_PRODUCTIONS}/"
    while url:
        res = requests.get(url, headers=HEADERS).json()
        for row in res.get('results', []):
            title = str(row.get("field_5743", "")).lower()
            if "mermaid" in title:
                prod_id = row['id']
                master_link = row.get("field_5774", [])
                master_id = master_link[0]['id'] if master_link else None
                print(f"✅ Found Production ID: {prod_id} | Master Show ID: {master_id}")
                return prod_id, master_id
        url = res.get('next')
    return None, None

def create_custom_role(role_name, master_show_id):
    print(f"✨ Creating custom role: {role_name.title()}...")
    url = f"{BASE_URL}/api/database/rows/table/{TABLE_ROLES}/"
    payload = {"field_5791": role_name.title()}
    if master_show_id:
        payload["field_5794"] = [master_show_id]
        
    res = requests.post(url, headers=HEADERS, json=payload)
    if res.status_code == 200:
        return res.json().get('id')
    else:
        print(f"❌ Failed to create role {role_name}: {res.text}")
        return None

def get_all_people():
    print("👥 Fetching People database...")
    people_map = {}
    url = f"{BASE_URL}/api/database/rows/table/{TABLE_PEOPLE}/"
    while url:
        res = requests.get(url, headers=HEADERS).json()
        for row in res.get('results', []):
            raw_name = row.get("field_5735", "")
            if isinstance(raw_name, list) and len(raw_name) > 0:
                name = raw_name[0].get("value", "")
            else:
                name = str(raw_name).strip()
                
            if name and name != "None":
                people_map[name.lower()] = row["id"]
        url = res.get('next')
    print(f"✅ Found {len(people_map)} people.")
    return people_map

def get_all_roles():
    print("🎭 Fetching Master Roles database...")
    roles_map = {}
    url = f"{BASE_URL}/api/database/rows/table/{TABLE_ROLES}/"
    while url:
        res = requests.get(url, headers=HEADERS).json()
        for row in res.get('results', []):
            raw_role = row.get("field_5791", "")
            role_name = str(raw_role).strip().lower().replace(" (mersister)", "")
            if role_name == "alana": role_name = "allana"
            if role_name and role_name != "none":
                roles_map[role_name] = row["id"]
        url = res.get('next')
    print(f"✅ Found {len(roles_map)} roles.")
    return roles_map

def create_assignment_batch(new_rows):
    url = f"{BASE_URL}/api/database/rows/table/{TABLE_ASSIGNMENTS}/batch/"
    res = requests.post(url, headers=HEADERS, json={"items": new_rows})
    if res.status_code == 200:
        print(f"   ✅ Chunk success! ({len(new_rows)} rows created)")
    else:
        print(f"   ❌ Chunk Error: {res.text}")

def main():
    if not TOKEN:
        print("❌ ERROR: Missing NEXT_PUBLIC_BASEROW_TOKEN")
        return

    prod_id, master_show_id = get_production_info()
    if not prod_id:
        print("❌ Could not find Little Mermaid in the Productions table!")
        return

    people_map = get_all_people()
    roles_map = get_all_roles()
    
    rows_to_create = []

    print("\n⚙️  Building New Assignments...")
    for role_key, actor_names in CAST_MAP.items():
        
        # 1. Match or Create the Role
        role_id = roles_map.get(role_key)
        if not role_id:
            role_id = create_custom_role(role_key, master_show_id)
            if not role_id:
                continue 
            roles_map[role_key] = role_id 
            
        # 2. Extract internal actor IDs
        actor_ids = []
        for name in actor_names:
            internal_id = people_map.get(name.lower())
            if internal_id:
                actor_ids.append(internal_id)
            else:
                print(f"⚠️ Warning: Could not find '{name}' in the People database.")
        
        # 3. 🟢 THE FIX: Create ONE row per actor, rather than stuffing them all into an array
        if actor_ids and role_id:
            for single_actor_id in actor_ids:
                rows_to_create.append({
                    "field_5787": [prod_id],          # Link to Production
                    "field_5796": [role_id],          # Link to Role Identity
                    "field_5786": [single_actor_id]   # Link to exactly ONE Actor
                })
    
    if rows_to_create:
        print(f"\n🚀 Creating {len(rows_to_create)} individual assignment rows...")
        chunk_size = 10
        for i in range(0, len(rows_to_create), chunk_size):
            chunk = rows_to_create[i:i + chunk_size]
            print(f"📦 Sending chunk {int(i/chunk_size) + 1} of {len(rows_to_create) // chunk_size + 1}...")
            create_assignment_batch(chunk)
            time.sleep(1) 
            
        print("\n🎉 All individual assignment rows created! Your UI will map them perfectly.")
    else:
        print("\n❌ Failed to build any rows to create.")

if __name__ == "__main__":
    main()