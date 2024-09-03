# Land Cover Classification of Kamabuye Sector of 2021-2023

This repository contains the code for land cover classification of the Kamabuye Sector, Bugesera District in Rwanda. The classification process utilizes Sentinel-2 imagery, filtered and simplified geometries, and machine learning classifiers to distinguish various land cover types such as water, built-up areas, bare land, cropland, and vegetation.

### Bands Used to Identify Objects on the Ground

- **Water**: Bands B8, B4, B2
  - **Explanation**: Identifies water bodies based on reflectance in near-infrared and visible bands.

- **Built-up Areas**: Bands B4, B3, B2
  - **Explanation**: Detects urban and built-up areas using red, green, and blue bands.

- **Bareland**: Bands B11, B8, B4
  - **Explanation**: Differentiates bare soil or land using shortwave infrared and visible bands.

- **Vegetation**: Bands B11, B8, B4
  - **Explanation**: Identifies vegetation by combining shortwave infrared and visible bands.


## Project Overview

The main objective of this project is to classify land cover types within Kamabuye Sector using Google Earth Engine (GEE). The code filters and simplifies geometries based on specific administrative boundaries and trains a Random Forest classifier to map various land cover classes.

## Code Sections

### 1. Filtering Features

The script begins by filtering features within the Kamabuye Sector based on predefined cells and villages.

```javascript
// Define the filters based on the specified features
var filteredFeatures = RIO
  .filter(ee.Filter.eq('Prov_Enlgi', 'East'))
  .filter(ee.Filter.eq('District', 'Bugesera'))
  .filter(ee.Filter.eq('Sector_1', 'Kamabuye'))
  .filter(ee.Filter.inList('Cellule_1', ['Kampeka', 'Nyakayaga', 'Tunda', 'Burenge', 'Biharagu']))
  .filter(ee.Filter.inList('Village', [ ... ]));
```

### 2. Simplifying Geometries

The code simplifies the filtered features to reduce the number of edges, making it more efficient for further analysis and visualization.

```javascript
// Function to simplify the geometry
function simplifyFeatureCollection(fc, maxError) {
  return fc.map(function(feature) {
    return feature.setGeometry(feature.geometry().simplify(maxError));
  });
}

```

### 3. Loading and Filtering Sentinel-2 Imagery

Sentinel-2 imagery is loaded, filtered by the simplified region, and clipped for further processing. Visualization parameters are set for RGB bands to display the imagery.

```javascript
// Import the Sentinel-2 image collection
var sentinel2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED");

// Filter the Sentinel-2 image collection using the simplified geometry
var rgbImage = sentinel2
  .filterBounds(verySimplifiedFilteredFeatures)
  .filterDate('2021-01-01', '2021-12-31')
  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 1)
  .median()
  .clip(verySimplifiedFilteredFeatures);


```

### 4. Classification Using Random Forest
A Random Forest classifier is trained using selected bands from the imagery. The land cover types are classified into water, built-up, bare land, cropland, and vegetation.

```javascript

// Train the Classifier
var classifier = ee.Classifier.smileRandomForest(100).train({
  features: trainingPartition, 
  classProperty: 'Class', 
  inputProperties: bands
});

// Classify the Image
var classified = rgbImage.select(bands).classify(classifier);
Map.addLayer(classified, {min: 0, max: 4, palette: ['blue', 'red', 'yellow', 'pink', 'green']}, 'Land Cover Classification');
```

### 5. Accuracy Assessment
The code evaluates the performance of the classifier using a confusion matrix, calculating overall accuracy, producer accuracy, and consumer accuracy.

```javascript

// Generate the confusion matrix
var confusionMatrix = testClassification.errorMatrix('Class', 'classification');
var accuracy = confusionMatrix.accuracy();
print('Overall Accuracy:', accuracy);

```

### 6. Visualization and Legend Creation

The classified map is visualized with legends for each land cover type, and a chart showing the area coverage of each class is generated.

```javascript

// Add the legend to the map
Map.add(legend);

// Create and display the chart
var chart = ui.Chart.image.byClass({
  image: ee.Image.pixelArea().multiply(1e-4).addBands(classified.rename('classification')),
  classBand: 'classification',
  region: verySimplifiedFilteredFeatures,
  reducer: ee.Reducer.sum(),
  scale: 25,
  classLabels: classLabels
});
print(chart);

```

### Exporting Results
The classified map is exported to Google Drive for further use.

``` javascript

// Export the classified map
Export.image.toDrive({
  image: classified,
  description: 'LandCoverClassificationKamabuye@21',
  scale: 10,
  region: verySimplifiedFilteredFeatures,
  maxPixels: 1e13
});

```

# Getting Started

## Prerequisites
- [Google Earth Engine account](https://code.earthengine.google.com/)
- Basic knowledge of JavaScript and remote sensing

## Usage
1. Open [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Copy and paste the script from this repository.
3. Run the script to visualize the classification on the map.
4. Use the [shapefile of Kamabuye Sector](https://code.earthengine.google.com/?asset=users/emanirag/kamabuye_villages_shapefiles) for the analysis.
5. View the final general code results:
   - [Year 2021](https://code.earthengine.google.com/f4ed02e5be0910b937cfe8797b7327e5)
   - [Year 2022](https://code.earthengine.google.com/d8a12f579bfd94a9a77898f8fda25e8f)
   - [Year 2023](https://code.earthengine.google.com/7db48a3a6493d98eec58628ca0fe32c9)

## Authors
**Eric Maniraguha** - Research Associate at Cylab Africa, Instructor at Adventist University of Central Africa.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Google Earth Engine for the platform and resources.
- Sentinel-2 mission for the satellite data.
