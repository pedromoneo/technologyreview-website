
import json
import os

def split_csv_line(line):
    result = []
    current = []
    in_string = False
    escape = False
    
    for char in line:
        if escape:
            current.append(char)
            escape = False
        elif char == '\\':
            escape = True
        elif char == "'" and not escape:
            in_string = not in_string
        elif char == "," and not in_string:
            val = "".join(current).strip()
            if val.upper() == "NULL":
                result.append(None)
            elif val.startswith("'") and val.endswith("'"):
                result.append(val[1:-1])
            else:
                result.append(val)
            current = []
        else:
            current.append(char)
    
    val = "".join(current).strip()
    if val.upper() == "NULL":
        result.append(None)
    elif val.startswith("'") and val.endswith("'"):
        result.append(val[1:-1])
    else:
        result.append(val)
    return result

def process_insert_line(line, table_name, columns, callback):
    start_idx = line.find(f"INSERT INTO `{table_name}` VALUES") + len(f"INSERT INTO `{table_name}` VALUES")
    values_str = line[start_idx:].strip()
    if values_str.endswith(";"):
        values_str = values_str[:-1]
    
    current_tuple = []
    paren_depth = 0
    in_string = False
    escape = False
    
    for char in values_str:
        if escape:
            current_tuple.append(char)
            escape = False
        elif char == '\\':
            current_tuple.append(char)
            escape = True
        elif char == "'":
            in_string = not in_string
            current_tuple.append(char)
        elif char == "(" and not in_string:
            paren_depth += 1
            if paren_depth > 1:
                current_tuple.append(char)
        elif char == ")" and not in_string:
            paren_depth -= 1
            if paren_depth == 0:
                row_str = "".join(current_tuple).strip()
                row = split_csv_line(row_str)
                if len(row) == len(columns):
                    data = dict(zip(columns, row))
                    callback(data)
                current_tuple = []
            else:
                current_tuple.append(char)
        elif paren_depth >= 1:
            current_tuple.append(char)

if __name__ == "__main__":
    sql_file = "backup_data/i10187628_aia01.sql"
    with open("backup_data/schema.json", "r") as f:
        schema = json.load(f)
    
    # Output files
    files = {
        "posts": open("backup_data/posts.jsonl", "w"),
        "attachments": open("backup_data/attachments.jsonl", "w"),
        "users": open("backup_data/users.jsonl", "w"),
        "terms": open("backup_data/terms.jsonl", "w"),
        "taxonomy": open("backup_data/term_taxonomy.jsonl", "w"),
        "relationships": open("backup_data/term_relationships.jsonl", "w"),
        "meta": open("backup_data/postmeta.jsonl", "w")
    }
    
    def post_cb(row):
        if row["post_type"] == "post" and row["post_status"] == "publish":
            files["posts"].write(json.dumps(row) + "\n")
        elif row["post_type"] == "attachment":
            files["attachments"].write(json.dumps(row) + "\n")
            
    def user_cb(row):
        files["users"].write(json.dumps(row) + "\n")
        
    def term_cb(row):
        files["terms"].write(json.dumps(row) + "\n")
        
    def tax_cb(row):
        files["taxonomy"].write(json.dumps(row) + "\n")
        
    def rel_cb(row):
        files["relationships"].write(json.dumps(row) + "\n")
        
    def meta_cb(row):
        # Only keep relevant meta to save space
        if row["meta_key"] in ["_thumbnail_id", "_edit_last"]:
            files["meta"].write(json.dumps(row) + "\n")

    print("Starting single-pass extraction...")
    line_count = 0
    with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line_count += 1
            if line_count % 100000 == 0:
                print(f"Read {line_count} lines...")
                
            if "INSERT INTO `oxwj_posts`" in line:
                process_insert_line(line, "oxwj_posts", schema["oxwj_posts"], post_cb)
            elif "INSERT INTO `oxwj_users`" in line:
                process_insert_line(line, "oxwj_users", schema["oxwj_users"], user_cb)
            elif "INSERT INTO `oxwj_terms`" in line:
                process_insert_line(line, "oxwj_terms", schema["oxwj_terms"], term_cb)
            elif "INSERT INTO `oxwj_term_taxonomy`" in line:
                process_insert_line(line, "oxwj_term_taxonomy", schema["oxwj_term_taxonomy"], tax_cb)
            elif "INSERT INTO `oxwj_term_relationships`" in line:
                process_insert_line(line, "oxwj_term_relationships", schema["oxwj_term_relationships"], rel_cb)
            elif "INSERT INTO `oxwj_postmeta`" in line:
                process_insert_line(line, "oxwj_postmeta", schema["oxwj_postmeta"], meta_cb)

    for f in files.values():
        f.close()
    print("Done.")
