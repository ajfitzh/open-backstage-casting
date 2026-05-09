
import requests
import os
from datetime import datetime, timedelta

# --- CONFIGURATION ---
BASEROW_TOKEN = os.environ.get("SANDBOX_BASEROW_TOKEN", "YmRUKcwf0jPPfChEf6vvslP608ENCdl9")
BASE_URL = "https://db.open-backstage.org/api"

PRODUCTIONS_TABLE_ID = "845" 
EVENTS_TABLE_ID = "860" 

HEADERS = {
    "Authorization": f"Token {BASEROW_TOKEN}",
    "Content-Type": "application/json"
}

def get_table_schema(table_id):
    url = f"{BASE_URL}/database/fields/table/{table_id}/"
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        return response.json()
    return []

def create_upcoming_show():
    print("🔍 Analyzing Production table schema...")
    fields = get_table_schema(PRODUCTIONS_TABLE_ID)
    
    options_map = {}
    writeable_names = []
    primary_text_field = None
    
    for f in fields:
        is_read_only = f.get('read_only', False)
        if not is_read_only:
            writeable_names.append(f['name'])
        
        if f['type'] == 'single_select' and not is_read_only:
            options_map[f['name']] = [opt['value'] for opt in f.get('select_options', [])]
            
        if f.get('primary') and f['type'] == 'text' and not is_read_only:
            primary_text_field = f['name']
            
    session_val = options_map.get('Session', [None])[0]
    type_val = options_map.get('Type', [None])[0]
    location_val = options_map.get('Location', [None])[0]
    
    status_opts = options_map.get('Status', [])
    status_val = "Upcoming" if "Upcoming" in status_opts else (status_opts[0] if status_opts else None)

    desired_payload = {
        "Title": "Playwright: The Musical (E2E)",
        "Is Active": True
    }
    if status_val: desired_payload["Status"] = status_val
    if session_val: desired_payload["Session"] = session_val
    if type_val: desired_payload["Type"] = type_val
    if location_val: desired_payload["Location"] = location_val

    payload = {}
    print(f"🎭 Building payload safely...")
    for key, val in desired_payload.items():
        if key in writeable_names:
            payload[key] = val
        else:
            print(f"   ⚠️ Skipping '{key}' (It is a formula/read-only field)")
            
    if "Title" not in payload and primary_text_field:
        payload[primary_text_field] = "Playwright: The Musical (E2E)"
        print(f"   🔄 Rerouted Title to primary field: '{primary_text_field}'")

    url = f"{BASE_URL}/database/rows/table/{PRODUCTIONS_TABLE_ID}/?user_field_names=true"
    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code == 200:
        show_id = response.json()['id']
        print(f"✅ Success! Created Production ID: {show_id}")
        return show_id
    else:
        print(f"❌ Failed to create production: {response.text}")
        return None

def seed_events(production_id):
    print(f"📅 Seeding upcoming events for Production {production_id}...")
    
    fields = get_table_schema(EVENTS_TABLE_ID)
    writeable_names = [f['name'] for f in fields if not f.get('read_only', False)]
    
    options_map = {}
    for f in fields:
        if f['type'] == 'single_select' and not f.get('read_only', False):
            options_map[f['name']] = [opt['value'] for opt in f.get('select_options', [])]
            
    available_event_types = options_map.get('Event Type', [])
    fallback_type = available_event_types[0] if available_event_types else None
    
    url = f"{BASE_URL}/database/rows/table/{EVENTS_TABLE_ID}/batch/?user_field_names=true"
    today = datetime.now()
    
    events = [
        { "name": "Open Auditions", "days_out": 1, "type": "Audition", "req": True },
        { "name": "Callbacks", "days_out": 3, "type": "Audition", "req": True },
        { "name": "Read Through", "days_out": 7, "type": "Rehearsal", "req": True },
        { "name": "Choreo: Act 1", "days_out": 9, "type": "Rehearsal", "req": False },
        { "name": "Tech Sunday", "days_out": 21, "type": "Tech", "req": True },
        { "name": "Dress Rehearsal", "days_out": 24, "type": "Tech", "req": True },
    ]
    
    items = []
    for evt in events:
        event_date = today + timedelta(days=evt["days_out"])
        safe_type = evt["type"] if evt["type"] in available_event_types else fallback_type
        
        # 🟢 FIX: Formatted as full ISO-8601 strings
        date_str = event_date.strftime("%Y-%m-%d")
        start_time_iso = f"{date_str}T17:00:00Z"
        end_time_iso = f"{date_str}T21:00:00Z"

        desired = {
            "Production": [production_id],
            "Event Date": date_str,
            "Start Time": start_time_iso,
            "End Time": end_time_iso,
            "Is Required": evt["req"]
        }
        if safe_type:
            desired["Event Type"] = safe_type
            
        safe_item = {k: v for k, v in desired.items() if k in writeable_names}
        items.append(safe_item)
        
    response = requests.post(url, headers=HEADERS, json={"items": items})
    
    if response.status_code == 200:
        print(f"✅ Success! Seeded {len(items)} events.")
    else:
        print(f"❌ Failed to seed events: {response.text}")

if __name__ == "__main__":
    show_id = create_upcoming_show()
    if show_id:
        seed_events(show_id)
        print("\n🚀 Sandbox is primed and ready for E2E testing!")