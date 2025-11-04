#!/usr/bin/env python3
"""Initialize the SQLite database with the schema"""

import sqlite3
import os
import sys

DB_PATH = "database/disease_detector.db"
SCHEMA_PATH = "database/schema.sql"

def init_database():
    # Remove old database if exists
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("Deleted old database")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Read schema
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            schema = f.read()
        
        # Execute each statement
        statements = [s.strip() for s in schema.split(';') if s.strip()]
        for stmt in statements:
            try:
                cursor.execute(stmt)
            except sqlite3.Error as e:
                print(f"⚠️  SQL Error: {e}")
                print(f"   Statement: {stmt[:100]}...")
        
        conn.commit()
        print("Database initialized successfully at " + DB_PATH)
        
        # Verify tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Created " + str(len(tables)) + " tables:")
        for table in tables:
            print(f"   - {table[0]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == '__main__':
    init_database()
