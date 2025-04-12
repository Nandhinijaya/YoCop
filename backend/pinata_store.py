import os
from dotenv import load_dotenv
import requests

load_dotenv()

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

def upload_to_pinata(data):
    url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
    headers = {
        "Content-Type": "application/json",
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
    }

    try:
        response = requests.post(url, json={"pinataContent": data}, headers=headers)
        response.raise_for_status()
        ipfs_hash = response.json().get("IpfsHash")
        print("✅ Uploaded to IPFS:", ipfs_hash)
        return ipfs_hash
    except requests.exceptions.RequestException as e:
        print("❌ Error uploading to Pinata:", e)
        print("📦 Response text:", response.text)
        return None
    
if __name__ == "__main__":
    sample_data = {
        "name": "Nandhini",
        "project": "Voice Emotion Detection",
        "prediction": "Happy"
    }

    ipfs_hash = upload_to_pinata(sample_data)

    if ipfs_hash:
        ipfs_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
        print("🌐 Your IPFS URL:", ipfs_url)
    else:
        print("❌ Failed to upload to IPFS.")

