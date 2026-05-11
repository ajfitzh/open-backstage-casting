import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")
TABLE_PEOPLE = "599"
P_HEADSHOT = "field_5776" # URL field

HEADERS = {"Authorization": f"Token {BASEROW_TOKEN}", "Content-Type": "application/json"}

# The wrong URL we injected earlier
WRONG_PREFIX = "https://cytheadshots.nyc3.digitaloceanspaces.com"
# The correct URL based on your DigitalOcean screenshot
CORRECT_PREFIX = "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/headshots"

def main():
    print("🔍 Scanning for broken headshot URLs...")
    
    # Get all people
    res = requests.get(f"{BASEROW_URL}/api/database/rows/table/{TABLE_PEOPLE}/?size=200", headers=HEADERS)
    people = res.json().get('results', [])
    
    fixed_count = 0
    for person in people:
        current_url = person.get(P_HEADSHOT, "")
        
        if current_url and WRONG_PREFIX in current_url:
            # Swap out the wrong prefix for the correct one
            new_url = current_url.replace(WRONG_PREFIX, CORRECT_PREFIX)
            
            print(f"🩹 Fixing URL for {person.get('field_5736', 'Unknown')}...")
            patch_res = requests.patch(
                f"{BASEROW_URL}/api/database/rows/table/{TABLE_PEOPLE}/{person['id']}/", 
                headers=HEADERS, 
                json={P_HEADSHOT: new_url}
            )
            
            if patch_res.status_code == 200:
                fixed_count += 1
            else:
                print(f"   ❌ Failed to patch: {patch_res.text}")
                
    print(f"\n✅ All done! Successfully healed {fixed_count} headshot URLs.")

if __name__ == "__main__":
    main()