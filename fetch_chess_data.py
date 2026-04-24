import requests
import json
import os
import time

def fetch_all_games(username):
    print(f"Fetching archives for {username}...")
    headers = {"User-Agent": "Chessmaxing (Script)"}
    archives_url = f"https://api.chess.com/pub/player/{username}/games/archives"
    
    response = requests.get(archives_url, headers=headers)
    if response.status_code != 200:
        print(f"Error fetching archives: {response.status_code}")
        return []
    
    archives = response.json().get("archives", [])
    all_games = []
    
    for archive_url in reversed(archives):
        print(f"Fetching games from {archive_url}...")
        res = requests.get(archive_url, headers=headers)
        if res.status_code == 200:
            games = res.json().get("games", [])
            all_games.extend(games)
        else:
            print(f"Error fetching games from {archive_url}: {res.status_code}")
        
        # Respect API limits
        time.sleep(0.1)
    
    # Sort games by end_time descending
    all_games.sort(key=lambda x: x.get("end_time", 0), reverse=True)
    return all_games

if __name__ == "__main__":
    username = "titouannnnnn"
    games = fetch_all_games(username)
    
    if games:
        output_dir = "data"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        output_file = os.path.join(output_dir, f"{username}_all.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(games, f, indent=2)
        
        print(f"Successfully saved {len(games)} games to {output_file}")
    else:
        print("No games found.")
