import json
import os
import urllib.request

# Corrected Highlightly API endpoint base
API_URL = "https://api.highlightly.net/v1/football/matches"
API_KEY = os.environ.get("HIGHLIGHTLY_API_KEY")

def fetch_data():
    if not API_KEY:
        print("HIGHLIGHTLY_API_KEY environment variable not found.")
        return

    # Highlightly usually accepts the API key as a query parameter or header depending on their portal. 
    # Let's try passing it via header or query string. 
    url = f"{API_URL}?apikey={API_KEY}"
    
    headers = {
        "User-Agent": "SpoilerFreeFootball/1.0"
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            matches = []
            # Adjust key depending on whether they return a list or an object with a matches array
            raw_items = data if isinstance(data, list) else data.get("matches", data.get("data", []))
            
            for item in raw_items:
                home = item.get("homeTeam", {}).get("name", item.get("home", "Home"))
                away = item.get("awayTeam", {}).get("name", item.get("away", "Away"))
                
                matches.append({
                    "id": item.get("id", 1),
                    "teams": f"{home} vs {away}",
                    "date": item.get("date", ""),
                    "score": item.get("score", "FT"),
                    "status": item.get("status", "FT"),
                    "highlightUrl": item.get("video_url", item.get("highlights", "#")),
                    "upvotes": 0,
                    "downvotes": 0
                })

            with open("matches.json", "w") as f:
                json.dump(matches, f, indent=2)
                
            print(f"Successfully updated matches.json with {len(matches)} matches.")
            
    except Exception as e:
        print(f"Error fetching from Highlightly API: {e}")

if __name__ == "__main__":
    fetch_data()
