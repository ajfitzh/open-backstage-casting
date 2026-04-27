import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

# Configuration
BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")
TABLE_ID = "620"  # Committee Preferences

HEADERS = {
    "Authorization": f"Token {BASEROW_TOKEN}",
    "Content-Type": "application/json"
}

def ping_committee_table():
    url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_ID}/" # Note: No user_field_names=true
    
    # Using your EXACT field IDs from the schema you provided
    payload = {
        "field_6099": [1106],      # STUDENT_ID (Link Row - must be array)
        "field_6096": [6097],      # PARENT_GUARDIAN_NAME (Link Row - must be array)
        "field_5955": "Costumes",  # PRE_SHOW_1ST (Single Select)
        "field_5956": "Concessions",# SHOW_WEEK_1ST (Single Select)
        "field_5958": ["No"],      # CHAIR_INTEREST (Multiple Select - must be array)
        "field_5959": "Ping test via Python", # NOTES_CONSTRAINTS (Long Text)
        "field_5960": False        # PROCESSED (Boolean)
    }

    print(f"Sending request to {url}...")
    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code in [200, 201]:
        print("Successfully created record!")
        print(f"New Row Data: {response.json()}")
    else:
        print(f"Failed! Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")

if __name__ == "__main__":
    ping_committee_table()