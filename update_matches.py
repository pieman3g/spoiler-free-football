import json
import os
import urllib.request

# Corrected Highlightly Football API endpoint
API_URL = "https://soccer.highlightly.net/matches"
API_KEY = os.environ.get("HIGHLIGHTLY_API_KEY")

def fetch_data():
    if not API_KEY:
        print("HIGHLIGHTLY_API_KEY environment variable not found.")
        return

    headers = {
        "x-rapidapi-key": API_KEY,
        "User-Agent": "SpoilerFreeFootball/1.0"
    }
    
    req = urllib.request.Request(API_URL, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            matches = []
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
