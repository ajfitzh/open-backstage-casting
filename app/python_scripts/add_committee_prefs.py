import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")

AUDITIONS_TABLE_ID = "630" # Grabbed from your error log!
HEADERS = {
    "Authorization": f"Token {BASEROW_TOKEN}",
    "Content-Type": "application/json"
}

# The fields the client requested
TARGET_FIELDS = [
    {"name": "Preferred Roles", "type": "long_text"},
    {"name": "Stage Romance", "type": "boolean"},
    {"name": "Callback Status", "type": "text"},
    {"name": "Voice Type", "type": "text"} # Adding just in case it's missing too
]

def main():
    print(f"🔍 Checking schema for Auditions Table ({AUDITIONS_TABLE_ID})...")
    
    # 1. Get existing fields
    response = requests.get(f"{BASEROW_URL}/api/database/fields/table/{AUDITIONS_TABLE_ID}/", headers=HEADERS)
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch fields: {response.text}")
        return

    existing_fields = response.json()
    existing_names = {f["name"].lower(): f for f in existing_fields}
    
    schema_output = []

    # 2. Check and Create Fields
    for target in TARGET_FIELDS:
        target_name_lower = target["name"].lower()
        
        if target_name_lower in existing_names:
            field_id = existing_names[target_name_lower]["id"]
            print(f"✅ Field '{target['name']}' already exists (field_{field_id})")
            schema_output.append(f"PREFERRED_ROLES: 'field_{field_id}', // Example mapping" if "roles" in target_name_lower else f"NEW_FIELD: 'field_{field_id}',")
        else:
            print(f"⚠️ Field '{target['name']}' missing. Creating...")
            
            create_res = requests.post(
                f"{BASEROW_URL}/api/database/fields/table/{AUDITIONS_TABLE_ID}/",
                headers=HEADERS,
                json=target
            )
            
            if create_res.status_code == 200:
                new_field = create_res.json()
                field_id = new_field["id"]
                print(f"🚀 Successfully created '{target['name']}' (field_{field_id})")
                schema_output.append(f"{target['name'].upper().replace(' ', '_')}: 'field_{field_id}',")
            else:
                print(f"❌ Failed to create '{target['name']}': {create_res.text}")

    # 3. Output the TypeScript Schema Update
    print("\n" + "="*50)
    print("🎉 ALL DONE! Add these lines to your DB.AUDITIONS.FIELDS in app/lib/schema.ts:\n")
    for line in schema_output:
        print(line)
    print("="*50 + "\n")

if __name__ == "__main__":
    main()