import requests
from html.parser import HTMLParser
from bs4 import BeautifulSoup
import re

file = open("top_game_ids.txt", "w")

for i in range(1, 20):
    url = "https://boardgamegeek.com/browse/boardgame/page/" + str(i)
    page = requests.get(url).text

    soup = BeautifulSoup(page, 'html.parser')

    game_links = soup.find_all("a", class_="primary")

    for link in game_links:
        href = link.get("href")
        id = re.findall("\/[0-9]+\/", href)
        file.write(id[0].strip("/") + "\n")

file.close()