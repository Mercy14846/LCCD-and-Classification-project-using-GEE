#🌍 Land Cover Classification and Change Detection in Lekki, Lagos (1990–2025)
This project analyzes land cover change in Lekki, Lagos State, Nigeria, over a 35-year period (1990–2025) at 7-year intervals using Landsat satellite imagery. It classifies land into four primary classes — Water, Built-up, Vegetation, and Wetlands — and performs change detection, accuracy assessment, and exports maps and statistics using the Google Earth Engine (GEE) platform.

🔧 Tools & Technologies
Google Earth Engine (GEE)

Landsat 5, 7, 8, and 9 imagery

JavaScript (GEE Code Editor)

Supervised Classification (CART classifier)

NDVI Thresholding

Area Statistics and Export

🧪 Methodology
Image Preprocessing

Landsat surface reflectance imagery (TOA/SR)

Cloud masking and filtering by date & region of interest (Lekki)

Supervised Classification

Four land cover classes:

0: Water

1: Built-up

2: Vegetation

3: Wetland

Classification performed for 1990, 1997, 2004, 2011, 2018, and 2025

Accuracy Assessment

Confusion matrix and overall accuracy using test data

NDVI-based thresholds for green cover validation

Change Detection

Gain and loss analysis between time steps

Area computation for each class per year

Export of classified images and charts

📊 Outputs
✅ Land cover maps for 1990–2025

📈 Bar charts showing class distribution per year

🔁 Gain/Loss maps showing land cover transitions

📁 Auto-exported assets to Google Drive

📍 Study Area
Lekki Peninsula, Lagos State, Nigeria

Area undergoing rapid urbanization and ecological shifts due to development and tourism

📌 Key Findings (if included in report)
Significant increase in built-up areas post-2011

Sharp decline in wetlands and green vegetation between 2018–2025

Water bodies remained relatively stable

🚀 How to Use
Open the GEE JavaScript Code Editor: https://code.earthengine.google.com/

Paste the full code from LULC_GEE_Code.js

Set your region of interest (ROI) to Lekki or desired AOI

Run the script

View and export results (maps, charts, confusion matrices)

📌 Credits
Satellite data: USGS Landsat Collection

Developed by: [Your Name] (OPE Akintola)

Affiliation: Remote Sensing & GIS, Nigeria

📄 License
This project is open-source and available under the MIT License.
