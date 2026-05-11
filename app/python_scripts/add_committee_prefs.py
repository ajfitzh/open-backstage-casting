import os
import requests
import urllib.parse
import time
from dotenv import load_dotenv

load_dotenv('.env.local')

# --- CONFIGURATION ---
BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")
DO_SPACES_URL = "https://cytheadshots.nyc3.digitaloceanspaces.com" 

PRODUCTION_ID = 2 
TABLE_PEOPLE = "599"
TABLE_AUDITIONS = "630"
TABLE_SLOTS = "772"

P_FIRST, P_LAST, P_DOB, P_TSHIRT, P_HEADSHOT, P_EMAIL = "field_5736", "field_5737", "field_5738", "field_6149", "field_5776", "field_6132"
A_PERFORMER, A_PROD, A_SLOT, A_STATUS = "field_6052", "field_6053", "field_7931", "field_7952"
S_LABEL = "field_7925"

HEADERS = {"Authorization": f"Token {BASEROW_TOKEN}", "Content-Type": "application/json"}

# JUST THE TWO WHO FAILED
FAILED_KIDS = [
    {"first": "Kayden", "last": "Alexander", "id": 3172, "file": "Alexander-Kayden -3966-1769036279.jpeg-160x160.jpg", "email": "marissah61@gmail.com", "dob": "2012-09-19", "tshirt": "Adult Medium", "time": "6/2/2026 5:00pm"},
    {"first": "Nathaniel", "last": "McNulty", "id": "NEW", "file": "McNulty-Nathaniel (Nate)-3573-1778253287.png-160x160.jpg", "email": "cjmix1@gmail.com", "dob": "2011-06-21", "tshirt": "Adult Medium", "time": "6/2/2026 2:00pm"}
]

def get_slot_map():
    url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_SLOTS}/?user_field_names=true"
    res = requests.get(url, headers=HEADERS)
    slots = res.json().get('results', [])
    slot_map = {}
    for s in slots:
        label = s.get('Time Label')
        if label:
            slot_map[label] = s['id']
            slot_map[s.get('Date/Time', '')] = s['id'] 
    return slot_map

def map_time_to_label(raw_time):
    time_str = raw_time.split(" ")[1] 
    formatted_time = time_str.upper().replace("PM", " PM").replace("AM", " AM")
    return f"Tuesday {formatted_time}"

def main():
    slots = get_slot_map()
    
    for kid in FAILED_KIDS:
        print(f"==========================================")
        
        # URL ENCODE THE FILENAME
        safe_filename = urllib.parse.quote(kid['file'])
        
        payload = {
            P_FIRST: kid['first'], P_LAST: kid['last'], P_DOB: kid['dob'], 
            P_TSHIRT: kid['tshirt'], P_EMAIL: kid['email'],
            P_HEADSHOT: f"{DO_SPACES_URL}/{safe_filename}"
        }
        
        try:
            if kid['id'] == "NEW":
                print(f"✨ Creating new record for {kid['first']}...")
                res = requests.post(f"{BASEROW_URL}/api/database/rows/table/{TABLE_PEOPLE}/", headers=HEADERS, json=payload)
                res.raise_for_status()
                p_id = res.json()['id']
            else:
                print(f"🔄 Updating existing record for {kid['first']}...")
                res = requests.patch(f"{BASEROW_URL}/api/database/rows/table/{TABLE_PEOPLE}/{kid['id']}/", headers=HEADERS, json=payload)
                res.raise_for_status()
                p_id = kid['id']

            formatted_label = map_time_to_label(kid['time'])
            slot_id = slots.get(formatted_label)
            
            if slot_id:
                aud_payload = {
                    A_PERFORMER: [p_id], A_PROD: [PRODUCTION_ID], 
                    A_SLOT: [slot_id], A_STATUS: "Pending"
                }
                a_res = requests.post(f"{BASEROW_URL}/api/database/rows/table/{TABLE_AUDITIONS}/", headers=HEADERS, json=aud_payload)
                a_res.raise_for_status()
                print(f"   ✅ Successfully booked slot: {formatted_label}")
            else:
                print(f"   ❌ FAILED to find matching slot for: {formatted_label}")
                
        except requests.exceptions.RequestException as e:
            print(f"   🚨 ERROR processing {kid['first']}: {e}")
            if hasattr(e.response, 'text'):
                print(f"      Details: {e.response.text}")

if __name__ == "__main__":
    main()