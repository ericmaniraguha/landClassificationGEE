
// RIO : shapefile: https://code.earthengine.google.com/?asset=users/emanirag/kamabuye_villages_shapefiles

// Define the filters based on the specified features
var filteredFeatures = RIO
  .filter(ee.Filter.eq('Prov_Enlgi', 'East'))
  .filter(ee.Filter.eq('District', 'Bugesera'))
  .filter(ee.Filter.eq('Sector_1', 'Kamabuye'))
  .filter(ee.Filter.inList('Cellule_1', ['Kampeka', 'Nyakayaga', 'Tunda', 'Burenge', 'Biharagu']))
  .filter(ee.Filter.inList('Village', [
    'Rebero', 'Kampeka', 'Murambi', 'Mabuye', 'Pamba I', 'Nyakayaga',
    'Ndama', 'Tunda', 'Nyabyondo', 'Mbuganzeri', 'Akaje', 'Akabazeyi',
    'Mparo', 'Ntungamo Ii', 'Biharagu', 'Byimana', 'Murago',
    'Mububaya Ii', 'Rubugu', 'Munazi', 'Muyigi', 'Senga', 'Fatinkanda',
    'Kanyonyera', 'Kagenge', 'Masangano', 'Mububa I', 'Murambo',
    'Ntungamo I', 'Nyarurama', 'Twuruziramire', 'Nyakariba', 'Akanigo',
    'Pamba Ii', 'Rusibya', 'Uwumusave', 'Uwibiraro I', 'Cyogamuyaga',
    'Rubirizi', 'Uwibiraro Ii'
  ]));

// Print the filtered FeatureCollection to the console
print('Filtered Features:', filteredFeatures);

// Function to simplify the geometry
function simplifyFeatureCollection(fc, maxError) {
  return fc.map(function(feature) {
    return feature.setGeometry(feature.geometry().simplify(maxError));
  });
}

// Simplify the filtered geometry to reduce the number of edges
var maxError = 100;  // Adjust 'maxError' as needed
var simplifiedFeatures = simplifyFeatureCollection(filteredFeatures, maxError);

// Merge all simplified geometries into a single geometry
var mergedSimplifiedFeatures = simplifiedFeatures.geometry().dissolve();

// Further simplify the merged geometry if needed
var verySimplifiedFilteredFeatures = mergedSimplifiedFeatures.simplify(500);  // Increase maxError for more simplification

// Add the very simplified region to the map to check
Map.addLayer(verySimplifiedFilteredFeatures, {color: 'red'}, 'Very Simplified Filtered Region');

// Visualization parameters for RGB bands
var imageVisParam = {
  bands: ["B4", "B3", "B2"],
  min: 309.86,
  max: 1551.14,
  gamma: 1.049,
  opacity: 1
};

// Import the Sentinel-2 image collection
var sentinel2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED");

// Filter the Sentinel-2 image collection using the simplified geometry
var rgbImage = sentinel2
  .filterBounds(verySimplifiedFilteredFeatures)
  .filterDate('2021-01-01', '2021-12-31')
  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 1)
  .median()
  .clip(verySimplifiedFilteredFeatures);

// Add the selected features to the map
Map.centerObject(verySimplifiedFilteredFeatures, 12);  // Adjust the zoom level as needed
Map.addLayer(verySimplifiedFilteredFeatures, {color: 'red'}, 'Selected Features Polygon');

// Add the RGB image layer to the map
Map.addLayer(rgbImage, imageVisParam, 'Sentinel-2 RGB Image');

// Bands selected 
// ============================ 
// water B8 B4 B2
// Buildup B4 B3 B2
// Bareland B11 B8 B4
// vegetation B11 B8 B4

// Merge all training points together
var merged_sample = water.merge(buildup).merge(bareland).merge(cropland).merge(vegetation);

print('Merged Sample:', merged_sample);

// Band Collection 
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12'];

// Make a training dataset by sampling regions using pixel values 
var training = rgbImage.select(bands).sampleRegions({
  collection: merged_sample, 
  properties: ['Class'],
  scale: 10
});

// Split the training dataset into training and testing subsets
var datawithRandom = training.randomColumn();  // Add a column of random numbers

// 80% for training, 20% for testing
var trainingPartition = datawithRandom.filter(ee.Filter.lt('random', 0.8));
var testingPartition = datawithRandom.filter(ee.Filter.gte('random', 0.8));

// print('Training Partition:', trainingPartition);
// print('Testing Partition:', testingPartition);

// Train the Classifier
var classifier = ee.Classifier.smileRandomForest(100).train({
  features: trainingPartition, 
  classProperty: 'Class', 
  inputProperties: bands
});


// Classify the Image
var classified = rgbImage.select(bands).classify(classifier);
Map.addLayer(classified, {min: 0, max: 4, palette: ['blue', 'red', 'yellow', 'pink', 'green']}, 'Land Cover Classification');

// Classify the testing partition using the trained classifier
var testClassification = testingPartition.classify(classifier);

// Generate the confusion matrix comparing actual classes ('Class') with predicted classes ('classification')
var confusionMatrix = testClassification.errorMatrix('Class', 'classification');

// Print the confusion matrix to inspect how the classifier performed in terms of class predictions
print('Confusion Matrix:', confusionMatrix);

// Calculate the overall accuracy of the classifier, which is the proportion of correctly classified instances
var accuracy = confusionMatrix.accuracy();
print('Overall Accuracy:', accuracy);

// Calculate the Producer's Accuracy, which indicates the probability that a given class is correctly predicted
var producerAccuracy = confusionMatrix.producersAccuracy();
print('Producer Accuracy:', producerAccuracy);

// Calculate the Consumer's Accuracy (User's Accuracy), which indicates the reliability of a predicted class label
var consumerAccuracy = confusionMatrix.consumersAccuracy();
print('Consumer Accuracy:', consumerAccuracy);

// Define the class names for better readability in the chart
var classNames = ['Water', 'Build up', 'Bareland', 'Crop Land', 'Vegetation'];

// Create the Confusion Matrix Array
var confusionMatrixArray = ee.Array(confusionMatrix.array());
print('Confusion Matrix Array:', confusionMatrixArray);




// Create a table chart of the confusion matrix
var confusionMatrixChart = ui.Chart.array.values({
  array: confusionMatrixArray,
  axis: 0  // x-axis for predicted classes
})
.setChartType('Table')
.setOptions({
  title: 'Confusion Matrix',
  vAxis: {
    title: 'True Class',
    ticks: [
      {v: 0, f: 'Water'},
      {v: 1, f: 'Build up'},
      {v: 2, f: 'Bareland'},
      {v: 3, f: 'Crop Land'},
      {v: 4, f: 'Vegetation'}
    ]
  },
  hAxis: {
    title: 'Predicted Class',
    ticks: [
      {v: 0, f: 'Water'},
      {v: 1, f: 'Build up'},
      {v: 2, f: 'Bareland'},
      {v: 3, f: 'Crop Land'},
      {v: 4, f: 'Vegetation'}
    ]
  },
  colorAxis: {colors: ['#ffffff', '#ff0000']}  // White to red color gradient
});

// Display the chart
print(confusionMatrixChart);

// Optionally, export the classified map
Export.image.toDrive({
  image: classified,
  description: 'LandCoverClassificationKamabuye@21',
  scale: 10,
  region: verySimplifiedFilteredFeatures,  // Use the simplified geometry
  maxPixels: 1e13
});

// Define the class labels and corresponding colors
var classLabels = ['Water', 'Build up', 'Bareland', 'Crop Land', 'Vegetation'];
var classColors = ['blue', 'red', 'yellow','pink', 'green'];

// Function to simplify each feature individually
function simplifyFeature(feature) {
  return feature.setGeometry(feature.geometry().simplify(100));  // Adjust maxError as needed
}

// Simplify each feature in the filtered collection
var simplifiedFilteredFeatures = filteredFeatures.map(simplifyFeature);

// Merge all simplified geometries into a single geometry
var mergedSimplifiedFilteredFeatures = simplifiedFilteredFeatures.geometry().dissolve();

// Further simplify the merged geometry if needed
var verySimplifiedFilteredFeatures = mergedSimplifiedFilteredFeatures.simplify(500);  // Increase maxError for more simplification

// Add the very simplified region to the map to check
Map.addLayer(verySimplifiedFilteredFeatures, {color: 'red'}, 'Very Simplified Filtered Region');

// Generate the chart using the simplified filtered region
var chart = ui.Chart.image.byClass({
  image: ee.Image.pixelArea().multiply(1e-4).addBands(classified.rename('classification')),
  classBand: 'classification',
  region: verySimplifiedFilteredFeatures,  // Use the simplified filtered region
  reducer: ee.Reducer.sum(),
  scale: 25,
  classLabels: classLabels  // Explicitly pass the class labels
});

// Customize the chart with class labels
chart.setOptions({
  title: 'LULC Area of Kamabuye Sector - Bugesera District of 2021',
  vAxis: {title: 'Area (Ha)'},
  hAxis: {
    title: 'Class',
    ticks: [
      {v: 0, f: 'Water'},
      {v: 1, f: 'Build up'},
      {v: 2, f: 'Bareland'},
      {v: 3, f: 'Crop Land'},
      {v: 4, f: 'Vegetation'}
    ]
  },
  colors: classColors  // Use the predefined class colors
});


// Customize the chart with class labels
chart.set

print(chart)
//===========================================For the map====================
// Create the legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Add a title to the legend
var legendTitle = ui.Label({
  value: 'Classification',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 10px 0',
    padding: '0'
  }
});

legend.add(legendTitle);  // Add the title to the legend

// Add the title to the map (corrected)
var title = ui.Label({
  value: 'Land Cover Landuse Classification Kamabuye Map 2021',
  style: {
    fontWeight: 'bold',
    fontSize: '20px',
    position: 'top-center',  // Fixed position
    padding: '8px',
    margin: '0 auto',
    textAlign: 'center'
  }
});
Map.add(title);

// Create a function to add color and label to the legend
var makeRow = function(color, name) {
  // Create the color box
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  
  // Create the label
  var description = ui.Label({
    value: name,
    style: {
      margin: '0 0 4px 6px'
    }
  });
  
  // Return the row
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// Add color and label rows to the legend
for (var i = 0; i < classLabels.length; i++) {
  legend.add(makeRow(classColors[i], classLabels[i]));
}

// Add the legend to the map
Map.add(legend);
