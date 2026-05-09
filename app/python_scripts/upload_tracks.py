import os
from dotenv import load_dotenv
import boto3

# 1. MAGIC FIX: Tell boto3 to completely ignore your local ~/.aws/credentials file
os.environ['AWS_SHARED_CREDENTIALS_FILE'] = '/dev/null'

# 2. Load variables from your .env file
load_dotenv()

# 3. Pull configuration from .env
ACCESS_KEY = os.getenv('DO_SPACES_KEY')
SECRET_KEY = os.getenv('DO_SPACES_SECRET')
ENDPOINT_URL = os.getenv('DO_SPACES_ENDPOINT')  # e.g., https://nyc3.digitaloceanspaces.com
REGION_NAME = os.getenv('DO_SPACES_REGION')     # e.g., us-east-1 (used for s3 compatibility)
SPACE_NAME = "cyt-fredericksburg"               # Hardcoded to match your web app's URL structure

FILES_TO_UPLOAD = {
    "Consider Yourself - Oliver (Karaoke Version).mp3": "oliver-consider-yourself.mp3",
    "Reflection - Mulan _ Karaoke Version _ KaraFun.mp3": "mulan-reflection.mp3",
    "Tomorrow from Annie - Karaoke Track with Lyrics on Screen (1).mp3": "annie-tomorrow.mp3",
    "Youve Got a Friend in Me - Toy Story (Randy Newman) _ Karaoke Version _ KaraFun.mp3": "toystory-friend-in-me.mp3"
}

def upload_to_spaces():
    if not ACCESS_KEY or not SECRET_KEY:
        print("❌ Missing DO_SPACES_KEY or DO_SPACES_SECRET in your .env file.")
        return

    # Initialize the S3 client using the exact credentials from your .env
    client = boto3.client(
        's3',
        region_name=REGION_NAME,
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY
    )

    print(f"🚀 Starting uploads to DigitalOcean Spaces ({SPACE_NAME})...")

    for local_file, clean_name in FILES_TO_UPLOAD.items():
        if not os.path.exists(local_file):
            print(f"❌ Could not find local file: {local_file}")
            continue

        remote_path = f"tracks/{clean_name}"
        
        try:
            print(f"Uploading {clean_name}...")
            client.upload_file(
                local_file,
                SPACE_NAME,
                remote_path,
                ExtraArgs={
                    'ACL': 'public-read',  # Ensure web app can play it
                    'ContentType': 'audio/mpeg'
                }
            )
            
            # Format the final public URL based on your endpoint
            clean_endpoint = ENDPOINT_URL.replace('https://', '')
            public_url = f"https://{SPACE_NAME}.{clean_endpoint}/{remote_path}"
            print(f"✅ Success! URL: {public_url}")
            
        except Exception as e:
            print(f"❌ Failed to upload {local_file}: {e}")

    print("🎉 All uploads complete!")

if __name__ == "__main__":
    upload_to_spaces()