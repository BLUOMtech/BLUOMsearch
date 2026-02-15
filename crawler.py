import requests
from bs4 import BeautifulSoup
import json
import time
from urllib.parse import urlparse, urljoin
import os
import sys

# --- CONFIGURATION ---
MAX_CRAWL_PER_RUN = 200
REQUEST_TIMEOUT = 10
RATE_LIMIT_DELAY = 1.0  # Seconds
USER_AGENT = 'BLUOMSearchBot/3.0 (+https://github.com/bluom-search)'

def normalize_domain(url):
    """Normalizes any URL to its root domain: https://domain.com/"""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if not domain:
            return None
        # Strip 'www.' for cleaner grouping
        if domain.startswith('www.'):
            domain = domain[4:]
        # Basic sanity check
        if '.' not in domain or len(domain) < 4:
            return None
        return f"https://{domain}/"
    except:
        return None

def load_json(filename, default):
    if os.path.exists(filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load {filename}: {e}")
            return default
    return default

def save_json(filename, data):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def crawl():
    # 1. Load data
    # Index: List of {url, title, description, links}
    index_list = load_json('index.json', [])
    index_map = {normalize_domain(item['url']): item for item in index_list if normalize_domain(item['url'])}
    
    # Queue: Dict of normalized_url -> {links: int}
    queue_data = load_json('queue.json', {})
    
    # 2. Safety Check: If queue is empty, initialize with core seeds
    if not queue_data and not index_map:
        print("Initializing queue with seed URLs...")
        # Note: In a real scenario, this would be the 500+ list provided in queue.json
        # This is a fallback in case queue.json is missing.
        initial_seeds = ["https://wikipedia.org", "https://github.com", "https://google.com"]
        for s in initial_seeds:
            norm = normalize_domain(s)
            if norm:
                queue_data[norm] = {"links": 1}

    # 3. Prepare processing
    crawled_this_run = 0
    headers = {'User-Agent': USER_AGENT}
    
    # Sort queue by link count (priority)
    sorted_queue = sorted(queue_data.items(), key=lambda x: x[1]['links'], reverse=True)
    
    print(f"--- BLUOM Crawler Started ---")
    print(f"Queue size: {len(queue_data)} | Already indexed: {len(index_map)}")

    for norm_url, info in sorted_queue:
        if crawled_this_run >= MAX_CRAWL_PER_RUN:
            print(f"Reached MAX_CRAWL_PER_RUN ({MAX_CRAWL_PER_RUN}). Stopping.")
            break
            
        if norm_url in index_map:
            if norm_url in queue_data:
                del queue_data[norm_url]
            continue
            
        try:
            print(f"[{crawled_this_run + 1}/{MAX_CRAWL_PER_RUN}] Crawling: {norm_url}")
            
            # Request page
            response = requests.get(norm_url, timeout=REQUEST_TIMEOUT, headers=headers)
            if response.status_code != 200:
                print(f"  Skipped (HTTP {response.status_code})")
                if norm_url in queue_data: del queue_data[norm_url]
                continue
                
            response.encoding = response.apparent_encoding or 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Content Extraction
            title_tag = soup.find('title')
            title = title_tag.string.strip() if title_tag and title_tag.string else norm_url
            
            description = ""
            meta_desc = soup.find("meta", attrs={"name": "description"}) or \
                        soup.find("meta", attrs={"property": "og:description"})
            if meta_desc:
                description = meta_desc.get("content", "").strip()
            
            if not description:
                # Fallback to first paragraph
                p_tag = soup.find('p')
                if p_tag:
                    description = p_tag.get_text().strip()[:160]
            
            # Commit to Index
            index_map[norm_url] = {
                "url": norm_url,
                "title": title[:100],
                "description": description[:250],
                "links": info['links']
            }
            
            # Discovery (External Domains)
            links_found = 0
            for link_tag in soup.find_all('a', href=True):
                href = link_tag['href']
                # Join relative paths to absolute for normalization
                abs_url = urljoin(norm_url, href)
                target_norm = normalize_domain(abs_url)
                
                if not target_norm:
                    continue
                
                # Link Tracking Logic
                if target_norm in index_map:
                    index_map[target_norm]['links'] += 1
                elif target_norm in queue_data:
                    queue_data[target_norm]['links'] += 1
                elif target_norm != norm_url:
                    # New domain discovery!
                    queue_data[target_norm] = {"links": 1}
                    links_found += 1
            
            crawled_this_run += 1
            if norm_url in queue_data:
                del queue_data[norm_url]
                
            print(f"  Success: '{title[:30]}...' | Discovered {links_found} new domains")
            
            # Rate limiting
            time.sleep(RATE_LIMIT_DELAY)

        except Exception as e:
            print(f"  Error: {e}")
            if norm_url in queue_data:
                del queue_data[norm_url]

    # 4. Persistence
    final_index = list(index_map.values())
    save_json('index.json', final_index)
    save_json('queue.json', queue_data)
    
    print(f"--- Statistics ---")
    print(f"Total Indexed: {len(final_index)}")
    print(f"Remaining in Queue: {len(queue_data)}")
    print(f"Run complete.")

if __name__ == "__main__":
    crawl()
