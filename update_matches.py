import json
import urllib.request
import urllib.parse
from datetime import datetime

def fetch_data():
    # Automatically get today's date in YYYYMMDD format for ESPN
    today_str = datetime.now().strftime("%Y%m%d")
    api_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates={today_str}"
    
    req = urllib.request.Request(
        api_url, 
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            matches = []
            events = data.get("events", [])
            
            # If no matches today, fallback to the current week's scoreboard without the strict date parameter
            if not events:
                fallback_url = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"
                req = urllib.request.Request(fallback_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req) as fallback_resp:
                    data = json.loads(fallback_resp.read().decode())
                    events = data.get("events", [])

            for event in events:
                match_id = event.get("id")
                match_name = event.get("name", "Match")
                status_type = event.get("status", {}).get("type", {})
                
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

            # Fallback sample data if the schedule block is empty between matchdays
            if not matches:
                matches = [{
                    "id": 1,
                    "teams": "Arsenal vs Chelsea",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "score": "Upcoming",
                    "status": "Scheduled",
                    "highlightUrl": "https://www.youtube.com/results?search_query=Arsenal+vs+Chelsea+highlights",
                    "upvotes": 0,
                    "downvotes": 0
                }]

            with open("matches.json", "w") as f:
                json.dump(matches, f, indent=2)
                
            print(f"Successfully updated matches.json with {len(matches)} matches.")
            
    except Exception as e:
        print(f"Error fetching ESPN data: {e}")

if __name__ == "__main__":
    fetch_data()
