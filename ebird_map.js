mapboxgl.accessToken = "***REMOVED***";

var map;
document.addEventListener('DOMContentLoaded', function() {
  // Map to show all observations
   map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v9",
    center: [0, 0],
    zoom: 8
  });

  map.on("load", function() {
    map.addSource("ebird-sightings", {"type": "geojson", "data": {"type": "FeatureCollection", "features": []}});
    map.addLayer({
      "id": "points",
      "type": "circle",
      "source": "ebird-sightings",
      "paint": {
        "circle-opacity" : {
          "base": 0.0,
          "stops": [[8, 0.5], [12, 0.5], [13, 1.0]]
        },
        "circle-radius": {
          "base": 2,
          "stops": [[8, 2], [11, 6], [22, 180]]
        },
        "circle-color": [
          "match",
          ["get", "time_ago_category"],
          "today", "green",
          "yesterday", "orange",
          "old", "red", "black"
        ]
      }
    });

    map.addLayer({
      "id": "points-labels",
      "type": "symbol",
      "source": "ebird-sightings",
      "layout": {
        "icon-allow-overlap": true,
        "icon-image": "circle-stroked-11",
        "text-field": "{title}",
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-offset": [0, 0.6],
        "text-size": 12,
        "text-anchor": "top",
      },
      "paint": {
        "icon-color":"#9fcb3b"
      }
    });

    // Set a popup to appear when a point is clicked.
    map.on("click", "points", function (e) {
      var coordinates = e.features[0].geometry.coordinates.slice();
      var description = e.features[0].properties.description;
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
      new mapboxgl.Popup().setLngLat(coordinates).setHTML(description).addTo(map);
    });
  });
}, false);

function jump_map(lon, lat) {
  map.jumpTo({center: [lon, lat]});
}

function add_map_source(name, spec) {
  map.addSource(name, spec);
}

function add_map_layer(spec) {
  map.addLayer(spec);
}

function get_map_center() {
  return map.getCenter();
}

function set_source_data(name, data) {
  map.getSource(name).setData(data);
}

// Plot data points on map.
var current_data_points = [];
function update_map() {
  console.log("Populating map with " + current_data_points.length + " points");
  let features = [];
  let now = moment();

  // Create mapping from location ID to all observations in that location.
  let location_sightings = new Map();
  current_data_points.forEach(function (obs, index) {
    obs.moment = moment(obs.obsDt, "YYYY-MM-DD HH:mm");
    let loc = obs.locId;
    if (!(location_sightings.has(loc))) {
      location_sightings.set(loc, [obs]);
    } else {
      location_sightings.get(loc).push(obs);
    }
  });

  // Plot each location's sightings on the map.
  location_sightings.forEach(function (sightings, loc, map) {
    // Sort sightings by date, and filter sightings that are too old.
    sightings.sort((a, b) => a.moment.isBefore(b.moment));
    sightings = sightings.filter(a => now.startOf("day").diff(a.moment.startOf("day"), "days") <= filter_days.value);

    // If there are sightings for this location that were not filtered out, build up the display message.
    if (sightings.length > 0) {
      // Calculate the number of days ago that the sighting occured, and get the time_ago_category, which lets us display different colors for different categories.
      let time_ago_days = now.startOf("day").diff(sightings[0].moment.startOf("day"), "days");
      let time_ago_category = 0;
      if (time_ago_days < 1) {
        time_ago_category = "today";
      } else if (time_ago_days < 2) {
        time_ago_category = "yesterday";
      } else {
        time_ago_category = "old";
      }
      // Prepare to build up a list of the species seen in a particular location and a display message for the popup.
      let species_seen = new Set();
      let description = "<h2>" + sightings[0].locName + "</h2>";
      sightings = sightings.filter((obs, index, self) => (index === self.findIndex((o) => (
        o.obsId === obs.obsId && o.speciesCode === obs.speciesCode))));
      sightings.forEach(function (obs, index) {
        description = description + "<b><a href=\"https://ebird.org/species/" + obs.speciesCode + "\" target=\"_blank\">" + obs.comName + "</a>" + (obs.howMany > 1 ? (" (" + obs.howMany + ")") : "") + "</b> observed <b>" + obs.moment.fromNow() + "</b> (<a href=\"https://ebird.org/view/checklist/" + obs.subId + "\" target=\"_blank\">" + obs.obsDt + "</a>) by " + obs.userDisplayName + (obs.obsReviewed ? "" : " (UNCONFIRMED)") + (obs.hasRichMedia ? " (with photo)" : "") + "<br>";
        species_seen.add(obs.comName);
      });
      // The title that is displayed on the map is a (de-duplicated) list of species.
      let title = [...species_seen].join(",\n");
      let new_feature = {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [sightings[0].lng, sightings[0].lat]
        },
        "properties": {
          "title": title,
          "description" : description,
          "time_ago_category" : time_ago_category
        }
      };
      features.push(new_feature);
    }
  });
  set_source_data("ebird-sightings", {"type": "FeatureCollection", "features": features});
}

// Load new eBird data to display.
function load_ebird_data() {
  let request = new XMLHttpRequest();
  let lnglat = get_map_center();
  request.addEventListener("load", function() {
    current_data_points = JSON.parse(request.responseText);
    update_map();
    refresh_button.classList.remove("floating-sync-button-loading");
    refresh_button.classList.add("floating-sync-button-loaded");
    refresh_button.classList.remove("fa-spin");
    update_radius_circle(lnglat);
  });
  refresh_button.classList.remove("floating-sync-button-loaded");
  refresh_button.classList.add("floating-sync-button-loading");
  refresh_button.classList.add("fa-spin");
  request.open("GET", "https://api.ebird.org/v2/data/obs/geo/recent/notable?lat=" + lnglat.lat + "&lng=" + lnglat.lng + "&sppLocale=en&detail=full&back=7&dist=" + distance_radius);
  request.setRequestHeader("X-eBirdApiToken", "***REMOVED***");
  request.send();
}