import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('.env.local')

BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")
AUDITIONS_TABLE_ID = "630" 

HEADERS = {
    "Authorization": f"Token {BASEROW_TOKEN}",
    "Content-Type": "application/json"
}

# 🟢 This mimics EXACTLY what submitRealAudition sends in actions/auditions.ts
payload = {
    # Using dummy ID '1' for the link rows just for testing
    "field_6052": [1], # PERFORMER 
    "field_6053": [1], # PRODUCTION 
    "field_6061": "2026-05-13", # DATE
    "field_6062": "Test Song", # SONG
    "field_7931": [], # AUDITION_SLOTS
    
    "field_7938": "Brown", # HAIR_COLOR
    "field_7939": False, # ACCEPT_ANY_ROLE
    "field_7940": True, # OFF_BOOK_AGREEMENT
    "field_7941": True, # PARENT_HELP_AGREEMENT
    "field_7942": "Yes (S), Yes (P)", # SIGNATURES
    "field_7943": "", # BACKING_TRACK
    
    "field_6081": "Unsure", # VOCAL_RANGE (🚨 Warning: Single Select)
    "field_7937": "9th", # GRADE (🚨 Warning: Single Select)
    
    "field_7958": True, # WILLING_TO_ALTER_APPEARANCE
    "field_7959": False, # FEAR_OF_HEIGHTS
    "field_7960": "None", # OTHER_TALENTS
    "field_6076": "Conflicts: None", # ADMIN_NOTES
    
    "field_9492": "Hero", # PREFERRED_ROLES
    "field_9493": False, # STAGE_ROMANCE
    "field_9494": "in-person", # CALLBACK_STATUS (🚨 Warning: Single Select)
    "field_9496": "Unsure", # VOICE_TYPE
}

def main():
    print(f"🚀 Firing exact payload at Auditions Table ({AUDITIONS_TABLE_ID})...")
    
    response = requests.post(
        f"{BASEROW_URL}/api/database/rows/table/{AUDITIONS_TABLE_ID}/", 
        headers=HEADERS,
        json=payload
    )
    
    print("\n" + "="*50)
    print(f"📡 RESPONSE STATUS: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("✅ SUCCESS! The database accepted it.")
        # If it succeeds, let's delete the dummy row so it doesn't clutter your DB
        row_id = response.json().get('id')
        if row_id:
            requests.delete(f"{BASEROW_URL}/api/database/rows/table/{AUDITIONS_TABLE_ID}/{row_id}/", headers=HEADERS)
            print(f"🧹 Cleaned up dummy row {row_id}.")
    else:
        print("❌ FAILURE! Here is the exact error from Baserow:")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
    print("="*50 + "\n")

if __name__ == "__main__":
    main()