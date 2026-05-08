import requests
import getpass

# --- CONFIGURATION ---
BASEROW_URL = "https://db.open-backstage.org"
TENANT_REGISTRY_TABLE_ID = "771" 
TENANT_SLUG = "e2e" 

def get_jwt_token(email, password):
    print("🔐 Authenticating...")
    response = requests.post(
        f"{BASEROW_URL}/api/user/token-auth/",
        json={"username": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()["token"]
    print(f"❌ Login failed: {response.text}")
    exit(1)

def get_sandbox_tables(jwt_token):
    headers = {"Authorization": f"JWT {jwt_token}", "Content-Type": "application/json"}
    print(f"🔍 Locating '{TENANT_SLUG}' in Master Registry...")
    
    url = f"{BASEROW_URL}/api/database/rows/table/{TENANT_REGISTRY_TABLE_ID}/?user_field_names=true&filter__Slug__equal={TENANT_SLUG}"
    res = requests.get(url, headers=headers).json()
    
    if 'results' not in res:
        print(f"❌ API Error: {res}")
        exit(1)
        
    if len(res['results']) == 0:
        print("❌ Tenant not found. Run the sync script first!")
        exit(1)
        
    return res['results'][0]

def get_field_map(table_id, jwt_token):
    """Dynamically maps human-readable field names to their new field_XYZ IDs."""
    headers = {"Authorization": f"JWT {jwt_token}", "Content-Type": "application/json"}
    url = f"{BASEROW_URL}/api/database/fields/table/{table_id}/"
    fields = requests.get(url, headers=headers).json()
    
    field_map = {}
    for f in fields:
        field_map[f["name"]] = f"field_{f['id']}"
        if f["type"] == "single_select" and "select_options" in f:
            field_map[f["name"] + "_options"] = { opt["value"]: opt["id"] for opt in f["select_options"] }
            
    return field_map

def seed_data(jwt_token):
    tenant_data = get_sandbox_tables(jwt_token)
    headers = {"Authorization": f"JWT {jwt_token}", "Content-Type": "application/json"}
    
    people_table_id = tenant_data.get("PEOPLE")
    productions_table_id = tenant_data.get("PRODUCTIONS")
    
    if not people_table_id or not productions_table_id:
        print("❌ Sandbox is missing the PEOPLE or PRODUCTIONS table IDs.")
        exit(1)

    print("🗺️  Mapping dynamic Field IDs...")
    people_fields = get_field_map(people_table_id, jwt_token)
    prod_fields = get_field_map(productions_table_id, jwt_token)

    # ---------------------------------------------------------
    # 1. SEED PRODUCTION
    # ---------------------------------------------------------
    print("🎭 Seeding Production...")
    active_status_id = prod_fields.get("Status_options", {}).get("Active")
    mainstage_type_id = prod_fields.get("Type_options", {}).get("Mainstage")

    prod_payload = {
        prod_fields["Title"]: "The Sandbox Summer Trial",
        prod_fields["Type"]: mainstage_type_id, 
        prod_fields["Status"]: active_status_id,
        prod_fields["Historical Cast Size"]: 35
    }
    
    prod_res = requests.post(f"{BASEROW_URL}/api/database/rows/table/{productions_table_id}/", headers=headers, json=prod_payload)
    if prod_res.status_code == 200:
        print("   ✅ Created: The Sandbox Summer Trial")
    else:
        print(f"   ❌ Failed to create production: {prod_res.text}")

    # ---------------------------------------------------------
    # 2. SEED ACTORS
    # ---------------------------------------------------------
    print("👯 Seeding Actors...")
    test_actors = ["James", "Gabriel", "Oliver"]
    
    for actor in test_actors:
        person_payload = {
            people_fields["First Name"]: actor,
            people_fields["Last Name"]: "Fitzhugh",
            people_fields["CYT Account Personal Email"]: f"{actor.lower()}@e2e-sandbox.org",
            people_fields["Phone Number"]: "555-0199"
        }
        
        person_res = requests.post(f"{BASEROW_URL}/api/database/rows/table/{people_table_id}/", headers=headers, json=person_payload)
        if person_res.status_code == 200:
            print(f"   ✅ Created: {actor} Fitzhugh")
        else:
            print(f"   ❌ Failed to create {actor}: {person_res.text}")

    print("\n🚀 Sandbox Seeding Complete! You are ready to run Playwright.")

if __name__ == "__main__":
    print("Please enter your Baserow credentials to generate a session token.")
    email = input("Email: ")
    password = getpass.getpass("Password: ") 
    
    jwt_token = get_jwt_token(email, password)
    seed_data(jwt_token)