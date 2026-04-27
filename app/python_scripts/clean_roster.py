import os
import requests
import difflib
from dotenv import load_dotenv

load_dotenv('.env.local')

BASEROW_URL = os.getenv("NEXT_PUBLIC_BASEROW_URL", "https://db.open-backstage.org").rstrip('/')
BASEROW_TOKEN = os.getenv("NEXT_PUBLIC_BASEROW_TOKEN")
TABLE_ROSTER = "630"
SHOW_ID = 94

HEADERS = {
    "Authorization": f"Token {BASEROW_TOKEN}",
    "Content-Type": "application/json"
}

# The definitive 75 names extracted from the official cast list
FINAL_CAST = [
    "Abby Griffin", "Abigail Burns", "Adalynn Erickson", "Adelynn Cook", "Adrianna Barber", "Aife Catelli",
    "Anistyn Shupe", "Aubree Garner", "Audrey Davis", "Ava Huray", "Barrett Tabisz", "Bella Adler", "Bret Miller",
    "Brielle Foggie", "Callie Corchado", "Caroline Davis", "Carson Green", "Chance Hansen", "Charlotte Roach",
    "Dottie Felts", "Elena Alfaro", "Ellie Chapman", "Ellie Miller", "Elsie Jane Adler", "Emma Gudowicz",
    "Emma Simmons", "Etta Moffitt", "Gabe Miller", "Gisele Whiteley", "Greta Godfrey", "Harper Anderson",
    "Hazel Jarrett", "Henry Mersiovsky", "Imani Burrell", "Jacob Hunt", "James Reno", "Janiya Davis", "Joanna Reno",
    "Jocelyn Blake Bolte", "Josh Gentry", "Juliana Lawrence", "Juliet Merideth", "Kaelyn Shupe", "Kailea Davis",
    "Kathryn Medina", "Katie Grace Alfaro", "Kendall Manton", "Kyla Tabisz", "Lana Cupina", "Levi Mersiovsky",
    "Lizzy Jeffris", "Luna Mena", "Lydia Tao", "Madison Hill", "Mary Jo Walsh", "Megan Scott", "Mia Wielgoszinski",
    "Miki Furlo", "Mila Medeiros", "Natalie Hill", "Nick Miller", "Olive McVicker", "Olivia Green", "Raegan Flanagan",
    "Rebecca Jarrett", "Rhylie Kosco", "Riley Hansen", "Ruby Covert", "Samantha Hunt", "Sydney Harrison", "Tie Eaddy",
    "Trey Filizetti", "Virginia Moffitt", "William Jarrett", "Zoe Turner"
]

def is_in_cast(name):
    name_lower = name.lower()
    for cast_member in FINAL_CAST:
        # 0.85 ratio handles things like "Josh Gentry" vs "Joshua Gentry"
        if difflib.SequenceMatcher(None, name_lower, cast_member.lower()).ratio() > 0.85:
            return True
    return False

def main():
    print(f"Fetching Roster for Show {SHOW_ID}...")
    url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_ROSTER}/?user_field_names=true&filter__field_6053__link_row_has={SHOW_ID}&size=200"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code >= 400:
        print("Error fetching data:", response.text)
        return
        
    rows = response.json().get('results', [])
    print(f"Found {len(rows)} students currently attached to the show.")
    
    dropped_count = 0
    
    for row in rows:
        # FIX: The column name in Table 630 is "Performer", not "Student Name"
        student_field = row.get("Performer", [])
        student_name = ""
        
        if isinstance(student_field, list) and len(student_field) > 0:
            student_name = student_field[0].get('value', '')
        elif isinstance(student_field, str):
            student_name = student_field
            
        if not student_name:
            continue
            
        if not is_in_cast(student_name):
            print(f"  [-] '{student_name}' is NOT on the final list. Removing from roster...")
            
            delete_url = f"{BASEROW_URL}/api/database/rows/table/{TABLE_ROSTER}/{row['id']}/"
            del_res = requests.delete(delete_url, headers=HEADERS)
            
            if del_res.status_code in [200, 204]:
                dropped_count += 1
            else:
                print(f"      [!] Error deleting {student_name}: {del_res.text}")

    print(f"\nCleanup Complete! Removed {dropped_count} non-cast members. New cast size is {len(rows) - dropped_count}.")

if __name__ == "__main__":
    main()
