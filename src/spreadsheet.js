var GoogleSpreadsheet = require('google-spreadsheet');
var doc = new GoogleSpreadsheet('1i5lnmeH9sqbYK-OSFLM-k8kr_Syi1HkRjJdAx3reRQg');

var moment = require('moment');

var fs = require('fs');

function setAuth(cb) {
  var creds = require('../credentials.json');
  doc.useServiceAccountAuth(creds, cb);
}

function generateJson() {
  console.log("Fetching sheet")
  doc.getRows(2, function(err, rows) { //second worksheet
    if (err) {
      console.log(err)
      return
    }
    console.log("Fetched sheet")
    var features = rows.map(featureFromRow);
    features = features.filter(function(feature) {
      if (!feature) return false
      if (feature.properties.status == "Abandoned") return false
      return true
    })
    var geojson = {
      "type": "FeatureCollection",
      "features": features
    }
    fs.writeFile('./nodes.json', JSON.stringify(geojson, null, 2), function(err) {
      if (err) console.error("Error writing geojson", err)
      else console.log("Saved geojson")
    })
  })
}

function featureFromRow(row, index) {
  var coordinates = row.coordinates.split(', ').reverse().map(function(c) {
    return parseFloat(c)
  })

  if (!coordinates[0])
    return null

  console.log(row)

  var feature = {
    type: "Feature",
    properties: {
      id: index,
      title: row.name,
      status: row.status
    },
    geometry: {
      coordinates: coordinates,
      type: "Point"
    }
  }
  return feature;
}

function addNode(data, cb) {
  sheet.addRow(data, function(err) {
    cb(err)
  })
}

setAuth(generateJson)
