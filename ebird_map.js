mapboxgl.accessToken = "***REMOVED***";

var current_data_points = [];
function set_data_points(data_points) {
  current_data_points = data_points;
}

// Plot data points on map.
function update_map(map) {
  console.log("Populating map with " + current_data_points.length + " points");
  let features = [];
  let start_of_today = moment().startOf("day");

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
    sightings = sightings.filter(a => start_of_today.diff(a.moment.clone().startOf("day"), "days") <= document.getElementById("filter-days").value);

    // If there are sightings for this location that were not filtered out, build up the display message.
    if (sightings.length > 0) {
      // Calculate the number of days ago that the sighting occured, and get the time_ago_category, which lets us display different colors for different categories.
      let time_ago_days = start_of_today.diff(sightings[0].moment.clone().startOf("day"), "days");
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
        description = description + "<b><a href=\"https://ebird.org/species/" + obs.speciesCode + "\" target=\"_blank\">" + obs.comName + "</a>" + (obs.howMany > 1 ? (" (" + obs.howMany + ")") : "") + "</b> observed <b>" + obs.moment.fromNow() + "</b> ";
        if (obs.hasOwnProperty("subId")) {
          description = description + "(<a href=\"https://ebird.org/view/checklist/" + obs.subId + "\" target=\"_blank\">" + obs.obsDt + "</a>) ";
        } else {
          description = description + "(" + obs.obsDt + ") ";
        }
        if (obs.hasOwnProperty("userDisplayName")) {
          description = description + "by " + obs.userDisplayName + (obs.obsReviewed ? "" : " (UNCONFIRMED)") + (obs.hasRichMedia ? " (with photo)" : "");
        }
        description = description + "<br>";
        let photo_suffix = (obs.hasRichMedia ? " (P)" : "")
        if (!species_seen.has(obs.comName) && !species_seen.has(obs.comName + " (P)")) {
          species_seen.add(obs.comName + photo_suffix);
        } else if (!species_seen.has(obs.comName + " (P)") && obs.hasRichMedia) {
          species_seen.delete(obs.comName);
          species_seen.add(obs.comName + photo_suffix);
        }
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
  map.getSource("ebird-sightings").setData({"type": "FeatureCollection", "features": features});
}
