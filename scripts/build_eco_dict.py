import requests
import json
import os
import re

def generate_eco_dict():
    index = {}
    base_url = "https://raw.githubusercontent.com/lichess-org/chess-openings/master/{}.tsv"
    
    for letter in ['a', 'b', 'c', 'd', 'e']:
        print(f"Fetching {letter.upper()}...")
        r = requests.get(base_url.format(letter))
        if r.status_code != 200:
            print(f"Failed to fetch {letter}")
            continue
            
        lines = r.text.strip().split('\n')
        for line in lines[1:]:
            parts = line.split('\t')
            if len(parts) >= 3:
                eco = parts[0]
                name = parts[1]
                pgn = parts[2]
                
                # Format pgn: remove move numbers like "1. ", "2... "
                # Lichess PGN in TSV is often "e4 e5 Nf3" but sometimes has numbers.
                # Let's clean it to be just space-separated SAN moves.
                clean_pgn = re.sub(r'\d+\.+\s*', '', pgn)
                clean_pgn = re.sub(r'\s+', ' ', clean_pgn).strip()
                
                if clean_pgn not in index:
                    index[clean_pgn] = {
                        "eco": eco,
                        "name": name
                    }

    os.makedirs("data", exist_ok=True)
    with open("data/lichess-eco.json", "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
        
    print(f"Generated data/lichess-eco.json with {len(index)} openings.")

if __name__ == "__main__":
    generate_eco_dict()
