import urllib.request
import re
import json
import os

url = "https://www.chessgames.com/chessecohelp.html"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8', errors='ignore')
except Exception as e:
    print(f"Error fetching: {e}")
    exit(1)

matches = re.findall(r'<tr>\s*<td>.*?>(.*?)</font></td>\s*<td>.*?>(.*?)</font></td>\s*<td>.*?>(.*?)</font></td>\s*</tr>', html, re.DOTALL | re.IGNORECASE)

eco_dict = {}
for match in matches:
    eco = match[0].strip()
    name = match[1].strip()
    moves = match[2].strip()
    
    # Clean HTML from moves if any
    moves = re.sub(r'<[^>]+>', '', moves)
    moves = moves.replace('&nbsp;', ' ')
    
    # Normalize moves string
    moves = re.sub(r'\s+', ' ', moves).strip()
    if moves and moves not in eco_dict:
        eco_dict[moves] = {"eco": eco, "name": name}

os.makedirs("data", exist_ok=True)
with open("data/chessgames-eco.json", "w", encoding="utf-8") as f:
    json.dump(eco_dict, f, indent=2, ensure_ascii=False)

print(f"Saved {len(eco_dict)} openings to data/chessgames-eco.json")
