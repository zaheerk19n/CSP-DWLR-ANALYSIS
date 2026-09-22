# Software Application for Analysis of DWLR Data and Alarm Generation

A full-stack web application designed to process, analyze, and visualize **Digital Water Level Recorder (DWLR)** groundwater sensor data from CSV logs and trigger real-time alerts for critical water level drops. Developed as part of the Community Service Project (CSP) for the village of Mollur, Andhra Pradesh.

---

## 📌 Project Overview

Digital Water Level Recorders (DWLR) track groundwater levels over time, but raw sensor output files (CSV format) are often difficult for non-technical users and village administrators to interpret quickly. 

This application bridges that gap by providing:
- **Automated CSV Data Ingestion & Cleaning**: Upload raw DWLR sensor logs directly into the web application.
- **Threshold-Based Alarm Generation**: Automatic identification of safe, warning, and critical water table levels.
- **Interactive Visual Dashboard**: Real-time interactive charts displaying time-series groundwater trends.
- **Community Decision Support**: Empowering local authorities and farmers to manage water resources sustainably.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Chart.js
- **Backend**: Python 3.x, Flask / FastAPI
- **Data Processing**: Pandas, NumPy
- **Data Input Format**: CSV files (Timestamp, Water Level readings)

---

## 🚀 Features

1. **CSV File Upload**: Simple drag-and-drop or file selector to import sensor data.
2. **Data Cleaning & Parsing**: Automatically handles missing values and formats timestamps.
3. **Dynamic Threshold Detection**:
   - 🟢 **Normal**: Safe groundwater reserves.
   - 🟡 **Warning**: Water level dropping below seasonal average.
   - 🔴 **Critical Alarm**: Immediate alert for extreme depletion.
4. **Interactive Time-Series Charts**: Visual representation of groundwater fluctuations using Chart.js.
5. **Data Summary & Export**: Displays key metrics (Min, Max, Average water levels) with download options.

---
