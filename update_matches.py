import json
import urllib.request

# ESPN's public unauthenticated Premier League scoreboard endpoint
API_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"

def fetch_data():
    req = urllib.request.Request(
        API_URL, 
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            matches = []
            events = data.get("events", [])
            
            for event in events:
                match_id = event.get("id")
                match_name = event.get("name", "Match") # e.g., "Arsenal vs Chelsea"
                status_type = event.get("status", {}).get("type", {})
                
                # State can be 'pre' (upcoming), 'in' (live), 'post' (finished)
                state = status_type.get("state", "pre")
                detail = status_type.get("detail", "Scheduled")
                
                competitions = event.get("competitions", [{}])[0]
                competitors = competitions.get("competitors", [])
                
                home_score = "0"
                away_score = "0"
                
                for comp in competitors:
                    if comp.get("homeAway") == "home":
                        home_score = comp.get("score", "0")
                    elif comp.get("homeAway") == "away":
                        away_score = comp.get("score", "0")
                
                if state == "pre":
                    score_str = "vs"
                    status_display = detail
                elif state == "in":
                    score_str = f"{home_score} - {away_score}"
                    status_display = f"LIVE {detail}"
                else:
                    score_str = f"{home_score} - {away_score}"
                    status_display = "FT"

                matches.append({
                    "id": match_id,
                    "teams": match_name,
                    "date": event.get("date", "")[:10],
                    "score": score_str,
                    "status": status_display,
                    "highlightUrl": f"https://www.youtube.com/results?search_query={urllib.parse.quote(match_name + ' highlights')}",
                    "upvotes": 0,
                    "downvotes": 0
                })

            with open("matches.json", "w") as f:
                json.dump(matches, f, indent=2)
                
            print(f"Successfully updated matches.json with {len(matches)} matches.")
            
    except Exception as e:
        print(f"Error fetching ESPN data: {e}")

if __name__ == "__main__":
    fetch_data()
