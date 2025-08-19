// ===================== Training Data Preparation =====================
Built_up = Built_up.map(function(f){ return f.set('Class', 0); });
Bareland = Bareland.map(function(f){ return f.set('Class', 1); });
Water = Water.map(function(f){ return f.set('Class', 2); });
Vegetation = Vegetation.map(function(f){ return f.set('Class', 3); });
Wetland = Wetland.map(function(f){ return f.set('Class', 4); });

// Merge all into one FeatureCollection
var trainingFC = Built_up.merge(Bareland).merge(Water).merge(Vegetation).merge(Wetland);

// ===================== Year & Sensor Config =====================
var yearsSensors = [
  {year: 2000, sensor: 'LE07'},
  {year: 2007, sensor: 'LE07'},
  {year: 2014, sensor: 'LC08'},
  {year: 2020, sensor: 'S2'},
  {year: 2025, sensor: 'LC09'} 
];

// ===================== NDVI Function =====================
function computeNDVI(image, sensor) {
  if (sensor === 'LE07' || sensor === 'LT05') {
    return image.normalizedDifference(['B4', 'B3']).rename('NDVI');
  } else if (sensor === 'LC08' || sensor === 'LC09') {
    return image.normalizedDifference(['B5', 'B4']).rename('NDVI');
  } else if (sensor === 'S2') {
    return image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  }
}

// ===================== Masking Functions =====================
function maskLandsatSR(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 5).eq(0));
  return image.updateMask(mask);
}

function maskSentinel(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
  return image.updateMask(mask);
}

// ===================== Load Imagery =====================
function loadImage(year, sensor) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, 'year');
  var collection;

  if (sensor === 'LE07') {
    collection = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
      .filterBounds(AOI).filterDate(start, end)
      .map(maskLandsatSR)
      .select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'],
              ['B1','B2','B3','B4','B5','B7']);
  } else if (sensor === 'LC08') {
    collection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
      .filterBounds(AOI).filterDate(start, end)
      .map(maskLandsatSR)
      .select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
              ['B1','B2','B3','B4','B5','B6','B7']);
  } else if (sensor === 'LC09') {
    collection = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
      .filterBounds(AOI).filterDate(start, end)
      .map(maskLandsatSR)
      .select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
              ['B1','B2','B3','B4','B5','B6','B7']);
  } else if (sensor === 'S2') {
    collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterBounds(AOI).filterDate(start, end)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map(maskSentinel)
      .select(['B2','B3','B4','B8','B11','B12']);
  }
  return collection.median().clip(AOI);
}

// ===================== Processing Variables =====================
var classifiedList = [];
var statisticsList = [];
var ndviChartData = [];

// ===================== Classification Function =====================
function classifyYear(year, sensor) {
  var image = loadImage(year, sensor);

  var trainingSample = image.sampleRegions({
    collection: trainingFC,
    properties: ['Class'],
    scale: 30,
    tileScale: 2
  });

  var classifier = ee.Classifier.smileRandomForest(50).train({
    features: trainingSample,
    classProperty: 'Class',
    inputProperties: image.bandNames()
  });

  var classified = image.classify(classifier).clip(AOI);
  classifiedList.push({year: year, image: classified});

  // 5-class palette
  var palette = ['yellow', 'orange', 'blue', 'green', 'purple'];
  Map.addLayer(classified, {min: 0, max: 4, palette: palette}, 'LULC ' + year, false);

  Export.image.toDrive({
    image: classified,
    description: 'LandCover_' + year,
    folder: 'LULC_LCC',
    fileNamePrefix: 'LandCover_' + year,
    region: AOI.geometry(),
    scale: 30,
    maxPixels: 1e13
  });

  // NDVI
  var ndvi = computeNDVI(image, sensor);
  var ndviThreshold = ndvi.gt(0.3).rename('NDVI_Class');
  Map.addLayer(ndvi, {min: -1, max: 1, palette: ['white','green']}, 'NDVI ' + year, false);
  Map.addLayer(ndviThreshold, {min: 0, max: 1, palette: ['red','green']}, 'NDVI_Threshold ' + year, false);

  Export.image.toDrive({ image: ndvi, description: 'NDVI_' + year, folder: 'LULC_LCC', fileNamePrefix: 'NDVI_' + year, region: AOI.geometry(), scale: 30, maxPixels: 1e13 });
  Export.image.toDrive({ image: ndviThreshold, description: 'NDVI_Threshold_' + year, folder: 'LULC_LCC', fileNamePrefix: 'NDVI_Threshold_' + year, region: AOI.geometry(), scale: 30, maxPixels: 1e13 });

  // Area Stats
  var areaImage = ee.Image.pixelArea().divide(1e6); // km²
  var totalArea = areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: AOI,
    scale: 30,
    maxPixels: 1e13
  }).getNumber('area');

  var stats = ee.List.sequence(0, 4).map(function(classValue) {
    classValue = ee.Number(classValue);
    var classMask = classified.eq(classValue);
    var area = areaImage.updateMask(classMask).reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: AOI,
      scale: 30,
      maxPixels: 1e13
    }).get('area');

    return ee.Feature(null, {
      'Year': year,
      'Class': classValue,
      'Area_km2': area,
      'Percent': ee.Number(area).divide(totalArea).multiply(100)
    });
  });

  statisticsList.push(ee.FeatureCollection(stats));

  // NDVI Mean for Chart
  var ndviMean = ndvi.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: AOI,
    scale: 30,
    maxPixels: 1e13
  }).get('NDVI');
  
  ndviChartData.push(ee.Feature(null, {'year': year, 'NDVI_mean': ndviMean}));
}

// ===================== Green Gain/Loss (Vegetation Only) =====================
function computeGainLoss(classifiedList) {
  for (var i = 0; i < classifiedList.length - 1; i++) {
    var current = classifiedList[i];
    var next = classifiedList[i+1];
    var gain = next.image.eq(3).and(current.image.neq(3));
    var loss = current.image.eq(3).and(next.image.neq(3));

    Map.addLayer(gain.updateMask(gain), {palette: 'green'}, 'Green Gain ' + current.year + '-' + next.year, false);
    Map.addLayer(loss.updateMask(loss), {palette: 'red'}, 'Green Loss ' + current.year + '-' + next.year, false);

    Export.image.toDrive({
      image: gain,
      description: 'GreenGain_' + current.year + '_' + next.year,
      folder: 'LULC_LCC',
      fileNamePrefix: 'GreenGain_' + current.year + '_' + next.year,
      region: AOI.geometry(),
      scale: 30,
      maxPixels: 1e13
    });
    Export.image.toDrive({
      image: loss,
      description: 'GreenLoss_' + current.year + '_' + next.year,
      folder: 'LULC_LCC',
      fileNamePrefix: 'GreenLoss_' + current.year + '_' + next.year,
      region: AOI.geometry(),
      scale: 30,
      maxPixels: 1e13
    });
  }
}

// ===================== Run All =====================
yearsSensors.forEach(function(obj) {
  classifyYear(obj.year, obj.sensor);
});

// Compute Gain/Loss
computeGainLoss(classifiedList);

// Export Area Stats
var finalStats = ee.FeatureCollection(statisticsList).flatten();
Export.table.toDrive({
  collection: finalStats,
  description: 'LULC_Area_Statistics',
  folder: 'LULC_LCC',
  fileNamePrefix: 'LULC_Area_Statistics',
  fileFormat: 'CSV'
});

// Export NDVI Mean
var ndviChartFC = ee.FeatureCollection(ndviChartData);
Export.table.toDrive({
  collection: ndviChartFC,
  description: 'NDVI_Yearly_Mean',
  folder: 'LULC_LCC',
  fileNamePrefix: 'NDVI_Yearly_Mean',
  fileFormat: 'CSV'
});

// Center Map
Map.centerObject(AOI, 15);

// ===================== Charts =====================
print('📊 Area by Class Over Years', ui.Chart.feature.groups({
  features: finalStats,
  xProperty: 'Year',
  yProperty: 'Area_km2',
  seriesProperty: 'Class'
}).setChartType('LineChart').setOptions({
  title: 'Land Cover Area (km²) per Class Over Time',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Area (km²)'},
  lineWidth: 2,
  pointSize: 5
}));

print('📊 Percent Cover by Class Over Years', ui.Chart.feature.groups({
  features: finalStats,
  xProperty: 'Year',
  yProperty: 'Percent',
  seriesProperty: 'Class'
}).setChartType('LineChart').setOptions({
  title: 'Land Cover Percentage per Class Over Time',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Percentage (%)'},
  lineWidth: 2,
  pointSize: 5
}));

print('🌱 Mean NDVI Over Years', ui.Chart.feature.byFeature(ndviChartFC, 'year', 'NDVI_mean')
  .setChartType('LineChart')
  .setOptions({
    title: 'Mean NDVI per Year',
    hAxis: {title: 'Year'},
    vAxis: {title: 'NDVI'},
    lineWidth: 2,
    pointSize: 5,
    colors: ['green']
}));
