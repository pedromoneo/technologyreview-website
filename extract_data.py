
import re
import json
import os

# Robust SQL value parser (handles escaped quotes and commas inside parentheses)
def parse_values(values_str):
    values = []
    current_val = []
    in_string = False
    escape = False
    paren_depth = 0
    
    i = 0
    while i < len(values_str):
        char = values_str[i]
        
        if escape:
            current_val.append(char)
            escape = False
        elif char == '\\':
            current_val.append(char)
            escape = True
        elif char == "'" and not escape:
            in_string = not in_string
            current_val.append(char)
        elif char == "(" and not in_string:
            paren_depth += 1
            if paren_depth > 1:
                current_val.append(char)
        elif char == ")" and not in_string:
            paren_depth -= 1
            if paren_depth == 0:
                values.append("".join(current_val).strip())
                current_val = []
                # Skip the comma after )
                i += 1
                while i < len(values_str) and values_str[i] in [' ', ',']:
                    i += 1
                continue
            else:
                current_val.append(char)
        elif char == "," and not in_string and paren_depth == 1:
            values.append("".join(current_val).strip())
            current_val = []
        else:
            current_val.append(char)
        i += 1
    return values

def split_csv_line(line):
    # This is a specialized parser for the content inside (v1, v2, 'v3', NULL)
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
    
    # Last value
    val = "".join(current).strip()
    if val.upper() == "NULL":
        result.append(None)
    else:
        result.append(val)
    return result

def extract_table_data(sql_file, table_name, output_file, filter_col=None, filter_val=None, columns=None):
    print(f"Extracting {table_name}...")
    count = 0
    with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f, open(output_file, 'w') as out:
        for line in f:
            if f"INSERT INTO `{table_name}` VALUES" in line:
                start_idx = line.find("VALUES") + 6
                values_str = line[start_idx:].strip()
                if values_str.endswith(";"):
                    values_str = values_str[:-1]
                
                # Each line can have multiple tuples: (val1, val2), (val3, val4)
                # We need to split them properly.
                tuples = []
                # Simple split by ),( - this is risky if content has it, but often works for WP
                # A better way is a real char-by-char parser.
                
                # Let's try char-by-char for safety
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
                            # End of tuple
                            row_str = "".join(current_tuple).strip()
                            row = split_csv_line(row_str)
                            
                            # Apply filter if needed
                            if filter_col and columns:
                                col_idx = columns.index(filter_col)
                                if row[col_idx] != filter_val:
                                    current_tuple = []
                                    continue
                            
                            if columns:
                                data = dict(zip(columns, row))
                                out.write(json.dumps(data) + "\n")
                            else:
                                out.write(json.dumps(row) + "\n")
                            
                            count += 1
                            if count % 1000 == 0:
                                print(f"Processed {count} rows...")
                            current_tuple = []
                        else:
                            current_tuple.append(char)
                    elif paren_depth >= 1:
                        current_tuple.append(char)

if __name__ == "__main__":
    sql_file = "backup_data/i10187628_aia01.sql"
    with open("backup_data/schema.json", "r") as f:
        schema = json.load(f)
    
    # Extracting Posts (only published posts)
    extract_table_data(sql_file, "oxwj_posts", "backup_data/posts.jsonl", 
                       filter_col="post_type", filter_val="post", columns=schema["oxwj_posts"])
    
    # Extracting Users
    extract_table_data(sql_file, "oxwj_users", "backup_data/users.jsonl", columns=schema["oxwj_users"])
    
    # Extracting Terms
    extract_table_data(sql_file, "oxwj_terms", "backup_data/terms.jsonl", columns=schema["oxwj_terms"])
    extract_table_data(sql_file, "oxwj_term_taxonomy", "backup_data/term_taxonomy.jsonl", columns=schema["oxwj_term_taxonomy"])
    extract_table_data(sql_file, "oxwj_term_relationships", "backup_data/term_relationships.jsonl", columns=schema["oxwj_term_relationships"])

    print("Extraction complete.")
