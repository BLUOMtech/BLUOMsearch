import requests
from bs4 import BeautifulSoup
import json
import time
from urllib.parse import urlparse
import os
import sys

def normalize_url(url):
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    if not domain:
        return None
    if domain.startswith('www.'):
        domain = domain[4:]
    return f"https://{domain}/"

def load_json(filename, default):
    if os.path.exists(filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return default
    return default

def save_json(filename, data):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def crawl():
    # 1. Load Data
    # index_data is a list of dicts: [{"url", "title", "description", "links"}]
    index_list = load_json('index.json', [])
    index_map = {normalize_url(item['url']): item for item in index_list if normalize_url(item['url'])}
    
    # queue_data is a dict: {normalized_url: {"original_url": str, "links": int}}
    queue_data = load_json('queue.json', {})
    
    # 2. Initialize Queue if empty
    seeds = [
        "https://www.wikipedia.org",
        "https://www.bbc.com",
        "https://www.nytimes.com",
        "https://www.theguardian.com",
        "https://www.reuters.com"
    ]
    
    if not queue_data and not index_map:
        for seed in seeds:
            norm = normalize_url(seed)
            if norm:
                queue_data[norm] = {"original_url": seed, "links": 1}

    # 3. Processing
    max_new_crawls = 50
    new_crawls_count = 0
    
    # Sort queue by link count (authority) descending to crawl most referenced first
    sorted_queue = sorted(queue_data.items(), key=lambda x: x[1]['links'], reverse=True)
    
    headers = {'User-Agent': 'BLUOMSearchBot/2.0 (+https://github.com/bluom-search)'}
    
    print(f"Starting incremental crawl. Queue size: {len(queue_data)}")

    for norm_url, info in sorted_queue:
        if new_crawls_count >= max_new_crawls:
            break
            
        if norm_url in index_map:
            # Already indexed, just remove from queue (authority already tracked)
            del queue_data[norm_url]
            continue
            
        try:
            time.sleep(1) # Rate limiting
            print(f"[{new_crawls_count + 1}/{max_new_crawls}] Crawling: {norm_url}")
            
            response = requests.get(norm_url, timeout=10, headers=headers)
            if response.status_code != 200:
                del queue_data[norm_url]
                continue
                
            response.encoding = response.apparent_encoding or 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Metadata extraction
            title_tag = soup.find('title')
            title = title_tag.string.strip() if title_tag and title_tag.string else norm_url
            
            description = ""
            meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
            if meta_desc:
                description = meta_desc.get("content", "").strip()
            
            if not description:
                p_tag = soup.find('p')
                if p_tag:
                    description = p_tag.get_text().strip()[:160] + "..."

            # Add to index
            index_map[norm_url] = {
                "url": norm_url,
                "title": title[:100],
                "description": description[:250],
                "links": info['links']
            }
            
            new_crawls_count += 1
            del queue_data[norm_url] # Remove from queue after successful crawl
            
            # Discovery
            for link in soup.find_all('a', href=True):
                found_url = link['href']
                if not found_url.startswith('http'):
                    continue
                    
                target_norm = normalize_url(found_url)
                if not target_norm:
                    continue
                
                # Link Authority Tracking
                if target_norm in index_map:
                    index_map[target_norm]['links'] += 1
                elif target_norm in queue_data:
                    queue_data[target_norm]['links'] += 1
                else:
                    queue_data[target_norm] = {"original_url": found_url, "links": 1}
                    
        except Exception as e:
            print(f"Error crawling {norm_url}: {e}", file=sys.stderr)
            if norm_url in queue_data:
                del queue_data[norm_url]

    # 4. Save state
    final_index = list(index_map.values())
    save_json('index.json', final_index)
    save_json('queue.json', queue_data)
    print(f"Run complete. Index: {len(final_index)} sites. Queue: {len(queue_data)} sites.")

if __name__ == "__main__":
    crawl()