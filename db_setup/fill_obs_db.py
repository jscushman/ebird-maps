#!/usr/bin/python3

import sqlite3
import argparse
import csv

def import_observations(file_name, user_id):
    with open(file_name, mode='r') as infile:
        reader = csv.DictReader(infile)
        with sqlite3.connect("../db/ebird_obs_data.sqlite") as conn:
            cur = conn.cursor()
    
            cur.execute("DELETE FROM Observations")
            observations_insert_sql = "INSERT INTO Observations(submission_id, common_name, scientific_name, state_id, county_name, date, user) VALUES(?,?,?,?,?,?,?)"
            for row in reader:
                cur.execute(observations_insert_sql, (row["Submission ID"], row["Common Name"], row["Scientific Name"], row["State/Province"], row["County"], row["Date"], user_id))

if __name__== "__main__":
    parser = argparse.ArgumentParser(description='Import observation data.')
    parser.add_argument('file_name', type=str, help='csv file name')
    parser.add_argument('user_id', type=str, help='user ID')
    args = parser.parse_args()
    import_observations(args.file_name, args.user_id)
