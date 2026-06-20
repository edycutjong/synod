# scripts/seed.py
import json
import requests
import sys

GATEWAY_URL = "http://localhost:3000/api/seed"

def seed():
    try:
        with open("data/fixtures/specialists.json", "r") as f:
            specialists = json.load(f)
        
        with open("data/fixtures/payouts.json", "r") as f:
            payouts = json.load(f)
    except FileNotFoundError as e:
        print(f"Fixture file not found: {e}")
        sys.exit(1)

    # Register specialists
    for spec in specialists:
        try:
            r = requests.post(f"{GATEWAY_URL}/specialist", json=spec)
            print(f"Seeded specialist {spec['id']}: {r.status_code}")
        except requests.exceptions.ConnectionError:
            print("Failed to connect to gateway server (localhost:3000). Ensure the dev server is running.")
            sys.exit(1)

    # Seed payouts
    for pid, payout in payouts.items():
        r = requests.post(f"{GATEWAY_URL}/payout", json=payout)
        print(f"Seeded payout {pid}: {r.status_code}")

if __name__ == "__main__":
    seed()
