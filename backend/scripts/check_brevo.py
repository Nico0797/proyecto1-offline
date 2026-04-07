
import os
import sys
import requests

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.config import Config

def check_brevo():
    print("=== Checking Brevo Configuration ===")
    
    api_key = os.getenv("BREVO_API_KEY")
    sender = os.getenv("BREVO_SENDER")
    sender_name = os.getenv("BREVO_SENDER_NAME")
    
    print(f"API Key present: {'YES' if api_key else 'NO'}")
    if api_key:
        print(f"API Key length: {len(api_key)}")
        if "placeholder" in api_key:
             print("WARNING: API Key seems to be a placeholder!")
    
    print(f"Sender Email: {sender}")
    print(f"Sender Name: {sender_name}")
    
    if not api_key:
        print("ERROR: Missing BREVO_API_KEY")
        return

    # 1. Check Account/Connection
    print("\n--- Testing Connection to Brevo API ---")
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "accept": "application/json"
    }
    
    try:
        response = requests.get("https://api.brevo.com/v3/account", headers=headers)
        print(f"Account Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Account Email: {data.get('email')}")
            print("Connection Successful!")
        else:
            print(f"Connection Failed: {response.text}")
            return
    except Exception as e:
        print(f"Exception checking account: {e}")
        return

    # 2. Check Sender
    print("\n--- Verifying Sender ---")
    if not sender:
        print("WARNING: BREVO_SENDER is not set. Using default logic might fail if not configured in Brevo account.")
    else:
        try:
            response = requests.get("https://api.brevo.com/v3/senders", headers=headers)
            if response.status_code == 200:
                senders = response.json().get("senders", [])
                found = False
                for s in senders:
                    print(f"- Found Sender: {s.get('email')} (Active: {s.get('active')})")
                    if s.get('email') == sender:
                        found = True
                        if not s.get('active'):
                            print("  WARNING: This sender is NOT active!")
                
                if not found:
                    print(f"WARNING: Configured sender '{sender}' not found in Brevo account list.")
            else:
                print(f"Failed to list senders: {response.text}")
        except Exception as e:
            print(f"Exception listing senders: {e}")

if __name__ == "__main__":
    # Load env vars
    from dotenv import load_dotenv
    load_dotenv()
    check_brevo()
