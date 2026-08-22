import csv
import cx_Oracle
from datetime import datetime

# Oracle DB connection
dsn = cx_Oracle.makedsn("localhost", 1521, service_name="ORCL")
conn = cx_Oracle.connect(user="your_user", password="your_password", dsn=dsn)
cursor = conn.cursor()

# Path to your CSV file
with open('dwlr_data.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        # Convert timestamp to proper format
        timestamp = datetime.strptime(row['TIMESTAMP'], '%Y-%m-%d %H:%M:%S')

        cursor.execute('''
            INSERT INTO DWLR_DATA 
            (DEVICE_ID, LOCATION, TIMESTAMP, WATER_LEVEL_M, BATTERY_LEVEL, SIGNAL_STATUS, ANOMALY_FLAG)
            VALUES (:1, :2, :3, :4, :5, :6, :7)
        ''', (
            row['DEVICE_ID'],
            row['LOCATION'],
            timestamp,
            float(row['WATER_LEVEL_M']) if row['WATER_LEVEL_M'] else None,
            int(row['BATTERY_LEVEL']) if row['BATTERY_LEVEL'] else None,
            row['SIGNAL_STATUS'],
            row['ANOMALY_FLAG']
        ))

conn.commit()
cursor.close()
conn.close()

print("CSV data inserted into DWLR_DATA successfully.")
