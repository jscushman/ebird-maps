#!/usr/bin/python3

import sqlite3
import requests

ebird_data_file = "ebird_region_data.sqlite"
country_url = "https://api.ebird.org/v2/ref/region/list/country/world.json"
headers = {"X-eBirdApiToken": "***REMOVED***"}
country_list = requests.get(url=country_url, headers=headers).json()

with sqlite3.connect(ebird_data_file) as conn:
    cur = conn.cursor()
    
    cur.execute("DELETE FROM Countries")
    cur.execute("DELETE FROM States")
    cur.execute("DELETE FROM Counties")
    countries_insert_sql = "INSERT INTO Countries(name, code) VALUES(?,?)"
    states_insert_sql = "INSERT INTO States(name, code) VALUES(?,?)"
    counties_insert_sql = "INSERT INTO Counties(name, code) VALUES(?,?)"
    i = 0
    for country_pair in country_list:
        print("{}: {} of {}".format(country_pair["name"], i, len(country_list)))
        i += 1
        cur.execute(countries_insert_sql, (country_pair["name"], country_pair["code"]))
        state_url = "https://api.ebird.org/v2/ref/region/list/subnational1/" + country_pair["code"] + ".json"
        county_url = "https://api.ebird.org/v2/ref/region/list/subnational2/" + country_pair["code"] + ".json"
        state_list = requests.get(url=state_url, headers=headers).json()
        for state_pair in state_list:
            cur.execute(states_insert_sql, (state_pair["name"], state_pair["code"]))
        county_list = requests.get(url=county_url, headers=headers).json()
        for county_pair in county_list:
            cur.execute(counties_insert_sql, (county_pair["name"], county_pair["code"]))
