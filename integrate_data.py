
import json
import re

def clean_html(raw_html):
    if not raw_html: return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext[:200] + "..." if len(cleantext) > 200 else cleantext

def integrate_data():
    print("Integrating data...")
    
    # 1. Load Terms
    terms = {}
    with open("backup_data/terms.jsonl", "r") as f:
        for line in f:
            row = json.loads(line)
            terms[row["term_id"]] = row["name"]
            
    # 2. Load Taxonomy
    taxonomies = {}
    with open("backup_data/term_taxonomy.jsonl", "r") as f:
        for line in f:
            row = json.loads(line)
            taxonomies[row["term_taxonomy_id"]] = {
                "term_id": row["term_id"],
                "taxonomy": row["taxonomy"]
            }
            
    # 3. Load Relationships
    post_terms = {}
    with open("backup_data/term_relationships.jsonl", "r") as f:
        for line in f:
            row = json.loads(line)
            pid = row["object_id"]
            tid = row["term_taxonomy_id"]
            if tid in taxonomies and taxonomies[tid]["taxonomy"] == "category":
                if pid not in post_terms: post_terms[pid] = []
                term_id = taxonomies[tid]["term_id"]
                if term_id in terms:
                    post_terms[pid].append(terms[term_id])
                    
    # 4. Load Meta (Thumbnails)
    post_thumbnails = {}
    with open("backup_data/postmeta.jsonl", "r") as f:
        for line in f:
            row = json.loads(line)
            if row["meta_key"] == "_thumbnail_id":
                post_thumbnails[row["post_id"]] = row["meta_value"]
                
    # 5. Load Attachments (URLs)
    attachments = {}
    with open("backup_data/attachments.jsonl", "r") as f:
        for line in f:
            row = json.loads(line)
            attachments[row["ID"]] = row["guid"]
            
    # 6. Load Users
    users = {}
    with open("backup_data/users.jsonl", "r") as f:
        for line in f:
            row = json.loads(line)
            users[row["ID"]] = row["display_name"]
            
    # 7. Process Posts
    final_articles = []
    with open("backup_data/posts.jsonl", "r") as f:
        for line in f:
            row = json.loads(line)
            pid = row["ID"]
            
            # Basic fields
            title = row["post_title"]
            content = row["post_content"]
            excerpt = row["post_excerpt"] if row["post_excerpt"] else clean_html(content)
            date = row["post_date"]
            author_id = row["post_author"]
            
            # Derived fields
            category = post_terms.get(pid, ["General"])[0]
            author = users.get(author_id, "Redacción")
            
            thumb_id = post_thumbnails.get(pid)
            image_url = attachments.get(thumb_id, "")
            
            # Default placeholder if no image
            if not image_url:
                image_url = "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"
            
            word_count = len(content.split())
            reading_time = f"{max(1, word_count // 200)} min"
            
            article = {
                "id": pid,
                "title": title,
                "excerpt": excerpt,
                "category": category,
                "author": author,
                "date": date,
                "readingTime": reading_time,
                "imageUrl": image_url,
                "content": content # Keeping full content for future use
            }
            final_articles.append(article)
            
    print(f"Total articles integrated: {len(final_articles)}")
    with open("backup_data/integrated_articles.json", "w", encoding="utf-8") as f:
        json.dump(final_articles, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    integrate_data()
