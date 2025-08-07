// ===================== AOI =====================
var AOI = ee.FeatureCollection("users/your_username/AOI_Lekki"); // Change to your asset

// ===================== TRAINING DATA =====================
var Built_up = ee.FeatureCollection("users/your_username/Built_up")
  .map(function(f){ return f.set('Class', 0); });
var Bareland = ee.FeatureCollection("users/your_username/Bareland")
  .map(function(f){ return f.set('Class', 1); });
var Water = ee.FeatureCollection("users/your_username/Water")
  .map(function(f){ return f.set('Class', 2); });
var Vegetation = ee.FeatureCollection("users/your_username/Vegetation")
  .map(function(f){ return f.set('Class', 3); });

// Merge into one FeatureCollection
var trainingFC = Built_up.merge(Bareland).merge(Water).merge(Vegetation);

// ===================== YEAR & SENSOR =====================
var yearsSensors = [
  {year: 2000, sensor: 'LE07'},
  {year: 2007, sensor: 'LE07'},
  {year: 2014, sensor: 'LC08'},
  {year: 2020, sensor: 'S2'},
  {year: 2025, sensor: 'LC09'} // Landsat 9 for 2025
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
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
               .and(qa.bitwiseAnd(1 << 5).eq(0));
  return image.updateMask(mask);
}

function maskSentinel(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8))
                .and(scl.neq(9)).and(scl.neq(10));
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
      .select(
        ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'], // only valid reflectance bands
        ['B1','B2','B3','B4','B5','B7']
      );
  }
  else if (sensor === 'LC08') {
    collection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
      .filterBounds(AOI).filterDate(start, end)
      .map(maskLandsatSR)
      .select(
        ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
        ['B1','B2','B3','B4','B5','B6','B7']
      );
  }
  else if (sensor === 'LC09') {
    collection = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
      .filterBounds(AOI).filterDate(start, end)
      .map(maskLandsatSR)
      .select(
        ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
        ['B1','B2','B3','B4','B5','B6','B7']
      );
  }
  else if (sensor === 'S2') {
    collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterBounds(AOI).filterDate(start, end)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map(maskSentinel)
      .select(
        ['B2','B3','B4','B8','B11','B12'],
        ['B2','B3','B4','B8','B11','B12']
      );
  }

  return collection.median().clip(AOI);
}

// ===================== Classification Function =====================
function classifyYear(year, sensor) {
  var image = loadImage(year, sensor);

  // Sample training data
  var trainingSample = image.sampleRegions({
    collection: trainingFC,
    properties: ['Class'],
    scale: 30,
    tileScale: 2
  });

  // Train classifier
  var classifier = ee.Classifier.smileRandomForest(50).train({
    features: trainingSample,
    classProperty: 'Class',
    inputProperties: image.bandNames()
  });

  // Classify
  var classified = image.classify(classifier);
  Map.addLayer(classified,
    {min: 0, max: 3, palette: ['yellow', 'orange', 'blue', 'green']},
    'LULC ' + year, false);

  Export.image.toDrive({
    image: classified,
    description: 'LandCover_' + year,
    folder: 'LandCover_Classification',
    fileNamePrefix: 'LandCover_' + year,
    region: AOI.geometry(),
    scale: 30,
    maxPixels: 1e13
  });

  // NDVI threshold classification
  var ndvi = computeNDVI(image, sensor);
  var ndviThreshold = ndvi.gt(0.3).rename('NDVI_Class');
  Map.addLayer(ndvi, {min: -1, max: 1, palette: ['white','green']}, 'NDVI ' + year, false);
  Map.addLayer(ndviThreshold, {min: 0, max: 1, palette: ['red','green']}, 'NDVI_Threshold ' + year, false);

  Export.image.toDrive({
    image: ndviThreshold,
    description: 'NDVI_Threshold_' + year,
    folder: 'NDVI_Threshold',
    fileNamePrefix: 'NDVI_Threshold_' + year,
    region: AOI.geometry(),
    scale: 30,
    maxPixels: 1e13
  });

  // Accuracy assessment
  var validation = trainingSample.randomColumn('random');
  var trainData = validation.filter(ee.Filter.lt('random', 0.7));
  var testData = validation.filter(ee.Filter.gte('random', 0.7));

  var trainedClassifier = ee.Classifier.smileRandomForest(50).train({
    features: trainData,
    classProperty: 'Class',
    inputProperties: image.bandNames()
  });

  var validated = testData.classify(trainedClassifier);
  var confMatrix = validated.errorMatrix('Class', 'classification');
  print('Confusion Matrix for ' + year, confMatrix);
  print('Accuracy for ' + year, confMatrix.accuracy());
}

// ===================== Run All Years =====================
yearsSensors.forEach(function(obj) {
  classifyYear(obj.year, obj.sensor);
});

Map.centerObject(AOI, 12);
