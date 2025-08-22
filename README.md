# Land Cover Classification and Change Detection in Lekki, Lagos (1990–2025)

This project analyzes land cover change in Lekki, Lagos State, Nigeria, over 35 years (1990–2025) at 7-year intervals using Landsat satellite imagery. It classifies land into four primary classes — **Water, Built-up, Vegetation, and Wetlands** — and performs change detection, accuracy assessment, and exports maps and statistics using the **Google Earth Engine (GEE)** platform.

## Tools & Technologies

- [Google Earth Engine (GEE)](https://earthengine.google.com/)
- Landsat 5, 7, 8, and 9 imagery
- JavaScript (GEE Code Editor)
- Supervised Classification (CART classifier)
- NDVI Thresholding
- Area Statistics and Export

## Methodology

1. **Image Preprocessing**
   - Landsat surface reflectance imagery (TOA/SR)
   - Cloud masking and filtering by date & region of interest (Lekki)

2. **Supervised Classification**
   - Four land cover classes:
     - `0`: Water  
     - `1`: Built-up  
     - `2`: Vegetation  
     - `3`: Wetland  
   - Classification performed for 1990, 1997, 2004, 2011, 2018, and 2025

3. **Accuracy Assessment**
   - Confusion matrix and overall accuracy using test data
   - NDVI-based thresholds for green cover validation

4. **Change Detection**
   - Gain and loss analysis between time steps
   - Area computation for each class per year
   - Export of classified images and charts

5. **Advanced Features**
   - **Green space gain/loss maps** between all time periods
   - **Change statistics table** (in hectares or km²)
   - **Auto-export of all green space gains/losses** to Google Drive

## Outputs

- **Land cover maps** for 2000–2025

## Study Area

- **Lekki Conservation Centre, Lagos State, Nigeria**
- Area undergoing rapid urbanization and ecological shifts due to development and tourism

## Key Findings (if included in report)

- Significant increase in built-up areas post-2011
- Sharp decline in wetlands and green vegetation between 2018–2025
- Water bodies remained relatively stable

## How to Use

1. Open the GEE JavaScript Code Editor: [https://code.earthengine.google.com/](https://code.earthengine.google.com/)
2. Paste the full code from `LULC_GEE_Code.js`
3. Set your region of interest (ROI) to Lekki or the desired AOI
4. Run the script
5. View and export results (maps, charts, confusion matrices)

## Credits

- Satellite data: USGS Landsat Collection
- Developed by: **Mercy Akintola**
- Affiliation: Remote Sensing & GIS, Nigeria

## License

This project is open-source and available under the **MIT License**.
