
import re
import json
import os

def parse_sql_file(file_path, table_name):
    print(f"Parsing {table_name} from {file_path}...")
    pattern = re.compile(rf"INSERT INTO `{table_name}` VALUES \((.*)\);")
    
    # We'll use a basic state machine to capture multiline inserts if necessary,
    # but WordPress dumps often have one INSERT per table or one INSERT per row.
    # Given the 2GB size, it's likely one INSERT per row or very large chunks.
    
    extracted_data = []
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if f"INSERT INTO `{table_name}`" in line:
                # This is a bit naive for very complex SQL, but works for standard WP dumps
                # SQL values can contain escaped parentheses, which makes simple regex hard.
                # But for a first pass, let's try to capture the line.
                match = re.search(rf"INSERT INTO `{table_name}` VALUES (.*);", line)
                if match:
                    values_str = match.group(1)
                    # Values are comma separated tuples: (1, 'val'), (2, 'val')
                    # This needs a proper parser for commas and quotes.
                    # For now, let's just log that we found it.
                    pass

def get_table_schema(file_path, table_name):
    columns = []
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        found = False
        for line in f:
            if f"CREATE TABLE `{table_name}`" in line:
                found = True
                continue
            if found:
                if line.strip().startswith("PRIMARY KEY") or line.strip().startswith("KEY") or line.strip().startswith(") ENGINE"):
                    break
                match = re.search(r"`(\w+)`", line)
                if match:
                    columns.append(match.group(1))
    return columns

if __name__ == "__main__":
    sql_file = "backup_data/i10187628_aia01.sql"
    tables = ["oxwj_posts", "oxwj_postmeta", "oxwj_terms", "oxwj_term_taxonomy", "oxwj_term_relationships", "oxwj_users"]
    
    schema = {}
    for table in tables:
        schema[table] = get_table_schema(sql_file, table)
        print(f"Table {table} columns: {schema[table]}")
    
    with open("backup_data/schema.json", "w") as f:
        json.dump(schema, f, indent=2)
