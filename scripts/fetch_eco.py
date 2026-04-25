import requests
import json
import os

def generate_eco_index():
    index = {}
    base_url = "https://raw.githubusercontent.com/lichess-org/chess-openings/master/{}.tsv"
    
    for letter in ['a', 'b', 'c', 'd', 'e']:
        print(f"Fetching {letter.upper()}...")
        r = requests.get(base_url.format(letter))
        if r.status_code != 200:
            print(f"Failed to fetch {letter}")
            continue
            
        lines = r.text.strip().split('\n')
        # Skip header: eco \t name \t pgn
        for line in lines[1:]:
            parts = line.split('\t')
            if len(parts) >= 3:
                eco = parts[0]
                name = parts[1]
                pgn = parts[2]
                
                # Split name by ":" or "," to find the parent family
                if ":" in name:
                    parent = name.split(":", 1)[0].strip()
                    variation = name.split(":", 1)[1].strip()
                elif "," in name:
                    parent = name.split(",", 1)[0].strip()
                    variation = name.split(",", 1)[1].strip()
                else:
                    parent = name.strip()
                    variation = "Base"
                
                # If we haven't seen this ECO code yet, save it as the default for this code
                if eco not in index:
                    index[eco] = {
                        "parent": parent,
                        "variation": variation,
                        "name": name,
                        "pgn": pgn
                    }
                else:
                    # If the current parent is shorter/more generic than the existing one, we might prefer it,
                    # but usually the first entry in TSV is the main line for that ECO.
                    pass

    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    with open("data/eco-index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
        
    print(f"Generated data/eco-index.json with {len(index)} ECO codes.")

if __name__ == "__main__":
    generate_eco_index()
