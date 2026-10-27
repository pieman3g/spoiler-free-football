import json
import os
import urllib.request

API_URL = "https://highlightly.net/api/football/highlights"
API_KEY = os.environ.get("HIGHLIGHTLY_API_KEY")

def fetch_data():
    if not API_KEY:
        print("HIGHLIGHTLY_API_KEY environment variable not found.")
        return

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "User-Agent": "SpoilerFreeFootball/1.0"
    }
    
    req = urllib.request.Request(API_URL, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            matches = []
            raw_highlights = data.get("highlights", [])
            
            for item in raw_highlights:
                matches.append({
                    "id": item.get("id"),
                    "teams": item.get("title", "Match"),
                    "date": item.get("date", ""),
                    "score": "FT",
                    "status": "FT",
                    "highlightUrl": item.get("video_url", "#"),
                    "upvotes": 0,
                    "downvotes": 0
                })

            with open("matches.json", "w") as f:
                json.dump(matches, f, indent=2)
                
            print(f"Successfully updated matches.json with {len(matches)} highlights.")
            
    except Exception as e:
        print(f"Error fetching from Highlightly API: {e}")

if __name__ == "__main__":
    fetch_data()
