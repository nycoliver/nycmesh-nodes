var GoogleSpreadsheet = require('google-spreadsheet');
var doc = new GoogleSpreadsheet('1bczvQFhQ5N2VjTLx1-QA361YkyJrsZ3F7mg0eI9BZWk');

var moment = require('moment');

var fs = require('fs');

var coordinates = {};

function setAuth(cb) {
  var creds = require('../credentials.json');
  console.log("Authorizing with sheets API...")
  doc.useServiceAccountAuth(creds, cb);
}

function generateJson() {
  console.log("Fetching nodes...")
  doc.getRows(3, function(err, rows) { //third worksheet is nodes
    if (err) {
      console.log(err)
      return
    }

    var active = { "type": "FeatureCollection", "features": [] },
      potential = { "type": "FeatureCollection", "features": [] };

    var statusCounts = {}

    var features = rows.map(pointFromRow).filter(removeAbandoned)

    features.forEach((feature) => {
      const { status, id } = feature.properties;
      if (status == "Installed") {
        active.features.push(feature)
      } else {
        potential.features.push(feature)
      }
      coordinates[id] = feature.geometry.coordinates;
      statusCounts[status] = statusCounts[status]+1 || 1;
      statusCounts['total'] = statusCounts['total']+1 || 1;
    })

    printStats(statusCounts)
    generateLinks()
    writeFile('./active.json', active)
    writeFile('./potential.json', potential)
  })
}

function printStats(statusCounts) {
  console.log((statusCounts['total'] || 0)+' nodes ('+
  (statusCounts['Installed'] || 0)+' active, '+
  (statusCounts['Installation Scheduled'] || 0)+' scheduled, '+
  (statusCounts['Interested'] || 0)+' interested, '+
  (statusCounts[''] || 0)+' no status)')
}

function generateLinks() {
  console.log("Fetching links...")
  doc.getRows(4, function(err, rows) { //third worksheet is nodes
    if (err) { console.log(err) return }
    const links = { "type": "FeatureCollection", "features": rows.map(linkFromRow) };
    writeFile('./links.json', links)
  })
}

function removeAbandoned(feature) {
  if (!feature) return false
  if (feature.properties.status == "Abandoned") return false
  return true
}

function writeFile(path, json) {
  fs.writeFile(path, JSON.stringify(json), function(err) {
    if (err) console.error("Error writing to " + path, err)
    else console.log("GeoJSON written to " + path)
  })
}

function linkFromRow(row) {
  // get coordinates
  // console.log(coordinates[row.from])
  if (row && row.from && row.to && row.status) {
    var feature = { "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          coordinates[row.from], coordinates[row.to]
        ]
      },
      properties: {
        status: row.status
      }
    }
    return feature
  }
}

function pointFromRow(row, index) {

  const { status, latlng, info, rooftopaccess } = row;
  const id = index+2; // correcting for title row and starts at 0

  var coordinates = latlng.split(', ').reverse().map(function(c) {
    return parseFloat(c)
  })

  if (!coordinates[0]) {
    console.log('Node '+id+' is missing latlng')
    return null
  }

  var feature = {
    type: "Feature",
    properties: {
      id: id,
      status: status
    },
    geometry: {
      coordinates: coordinates,
      type: "Point"
    }
  }

  if (info) {
    feature.properties.info = info;
  }

  if (rooftopaccess && rooftopaccess != '') {
    feature.properties.roof = true;
  }

  // get panoramas
  // pretty hacky but should work fine for now
  if (fs.existsSync('panoramas/'+id+'.jpg')) {
    feature.properties.panoramas = [id+'.jpg'];

    if (fs.existsSync('panoramas/'+id+'a.jpg')) {
      feature.properties.panoramas.push(id+'a.jpg');
    }
    if (fs.existsSync('panoramas/'+id+'b.jpg')) {
      feature.properties.panoramas.push(id+'b.jpg');
    }
    if (fs.existsSync('panoramas/'+id+'c.jpg')) {
      feature.properties.panoramas.push(id+'c.jpg');
    }
  }

  return feature;
}

setAuth(generateJson)
