mapboxgl.accessToken = "***REMOVED***";

// Distance radius for finding observations
var distance_radius = 100;

// Data points to display on map
var location_sightings = new Map();

function set_data_points(current_data_points) {
  // Create mapping from location ID to all observations in that location.
  current_data_points.forEach(function(obs, index) {
    obs.moment = moment(obs.obsDt, "YYYY-MM-DD HH:mm");
    const loc = obs.locId;
    if (!(location_sightings.has(loc))) {
      location_sightings.set(loc, [obs]);
    } else {
      location_sightings.get(loc).push(obs);
    }
    obs.description = "<b><a href=\"https://ebird.org/species/" + obs.speciesCode + "\" target=\"_blank\">" + obs.comName + "</a>" + (obs.howMany > 1 ? (" (" + obs.howMany + ")") : "") + "</b> observed <b>" + obs.moment.fromNow() + "</b> ";
    if (obs.hasOwnProperty("subId")) {
      obs.description = obs.description + "(<a href=\"https://ebird.org/view/checklist/" + obs.subId + "\" target=\"_blank\">" + obs.obsDt + "</a>) ";
    } else {
      obs.description = obs.description + "(" + obs.obsDt + ") ";
    }
    if (obs.hasOwnProperty("userDisplayName")) {
      obs.description = obs.description + "by " + obs.userDisplayName + (obs.obsReviewed ? "" : " (UNCONFIRMED)") + (obs.hasRichMedia ? " (with photo)" : "");
    }
  });
}

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
    map.addSource("ebird-sightings", {
      "type": "geojson",
      "data": {
        "type": "FeatureCollection",
        "features": []
      }
    });
    map.addLayer({
      "id": "points",
      "type": "circle",
      "source": "ebird-sightings",
      "paint": {
        "circle-opacity": {
          "base": 0.0,
          "stops": [
            [8, 0.5],
            [12, 0.5],
            [13, 1.0]
          ]
        },
        "circle-radius": {
          "base": 2,
          "stops": [
            [8, 2],
            [11, 6],
            [22, 180]
          ]
        },
        "circle-color": [
          "match", ["get", "time_ago_category"],
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
        "icon-color": "#9fcb3b"
      }
    });

    // Set a popup to appear when a point is clicked.
    map.on("click", "points", function(e) {
      var coordinates = e.features[0].geometry.coordinates.slice();
      var description = e.features[0].properties.description;
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
      new mapboxgl.Popup().setLngLat(coordinates).setHTML(description).addTo(map);
    });

    // Show search radius
    map.addSource("search-radius-points", {
      "type": "geojson",
      "data": {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            []
          ]
        }
      }
    });
    map.addLayer({
      "id": "search-radius",
      "type": "line",
      "source": "search-radius-points",
      "paint": {
        "line-opacity": 0.2
      }
    });

    // Get the current location and initialize map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => set_up_map(position.coords.longitude, position.coords.latitude));
    } else {
      set_up_map(0, 0);
    }

    // Display appropriate text when the number of days is changed.
    const filter_days = document.getElementById("filter-days");
    const days_to_search_display = document.getElementById("days-to-search");
    filter_days.oninput = function() {
      if (filter_days.value == 0) {
        days_to_search_display.innerHTML = "Today only";
      } else if (filter_days.value == 1) {
        days_to_search_display.innerHTML = "Since yesterday";
      } else {
        days_to_search_display.innerHTML = "Last " + filter_days.value + " days";
      }
      update_map(map);
    };
    days_to_search_display.innerHTML = filter_days.value + " days";
  });

  // Load new eBird data when the refresh button is clicked.
  document.getElementById("refresh").onclick = load_ebird_data;
}, false);

// Set up the map.
function set_up_map(lon, lat) {
  map.jumpTo({
    center: [lon, lat]
  });
  load_ebird_data();
}

// Draw a circle of the appropriate radius at the appropriate location.
function update_radius_circle(lnglat) {
  const lng_rad = lnglat.lng * Math.PI / 180
  const lat_rad = lnglat.lat * Math.PI / 180
  const distance_radians = distance_radius / 6356
  const radius_points = []
  for (i = 0; i <= 100; i++) {
    const angle = 2 * Math.PI * i / 100;
    const newlat = Math.asin(Math.sin(lat_rad) * Math.cos(distance_radians) + Math.cos(lat_rad) * Math.sin(distance_radians) * Math.cos(angle))
    const newlon = lng_rad + Math.atan2(Math.sin(angle) * Math.sin(distance_radians) * Math.cos(lat_rad), Math.cos(distance_radians) - Math.sin(lat_rad) * Math.sin(newlat))
    radius_points.push([newlon * 180 / (Math.PI), newlat * 180 / (Math.PI)])
  }
  map.getSource("search-radius-points").setData({
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [radius_points]
    }
  });
}

// Load new eBird data to display.
function load_ebird_data() {
  const request = new XMLHttpRequest();
  const lnglat = map.getCenter();
  const refresh_button = document.getElementById("refresh");
  request.addEventListener("load", function() {
    set_data_points(JSON.parse(request.responseText));
    update_map(map);
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

// Plot data points on map.
function update_map(map) {
  console.log("Populating map with " + location_sightings.size + " sighting locations.");
  const features = [];
  const start_of_today = moment().startOf("day");

  // Plot each location's sightings on the map.
  location_sightings.forEach(function(sightings, loc, map) {
    // Sort sightings by date, and filter sightings that are too old.
    sightings.sort((a, b) => a.moment.isBefore(b.moment));
    sightings = sightings.filter(a => start_of_today.diff(a.moment.clone().startOf("day"), "days") <= document.getElementById("filter-days").value);

    // If there are sightings for this location that were not filtered out, build up the display message.
    if (sightings.length > 0) {
      // Calculate the number of days ago that the sighting occured, and get the time_ago_category, which lets us display different colors for different categories.
      const time_ago_days = start_of_today.diff(sightings[0].moment.clone().startOf("day"), "days");
      const time_ago_category = (() => {
        if (time_ago_days < 1) {
          return "today";
        } else if (time_ago_days < 2) {
          return "yesterday";
        } else {
          return "old";
        }
      })();
      // Prepare to build up a list of the species seen in a particular location and a display message for the popup.
      const species_seen = new Map();
      let description = "<h2>" + sightings[0].locName + "</h2>";
      sightings = sightings.filter((obs, index, self) => (index === self.findIndex((o) => (
        o.obsId === obs.obsId && o.speciesCode === obs.speciesCode))));
      sightings.forEach(function(obs, index) {
        description = obs.description + "<br>";
        if (!species_seen.has(obs.comName)) {
          species_seen.set(obs.comName, {
            "has_photo": obs.hasRichMedia
          });
        } else {
          species_seen.get(obs.comName).has_photo = species_seen.get(obs.comName).has_photo || obs.hasRichMedia;
        }
      });

      // The title that is displayed on the map is a (de-duplicated) list of species.
      species_seen_display_name = []
      species_seen.forEach(function(properties, species, map) {
        species_seen_display_name.push(species + (properties.has_photo ? " (P)" : ""))
      });
      const title = [...species_seen_display_name].join(",\n");
      const new_feature = {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [sightings[0].lng, sightings[0].lat]
        },
        "properties": {
          "title": title,
          "description": description,
          "time_ago_category": time_ago_category
        }
      };
      features.push(new_feature);
    }
  });
  map.getSource("ebird-sightings").setData({
    "type": "FeatureCollection",
    "features": features
  });
}
