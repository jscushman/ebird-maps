import { environment } from '../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { EbirdQueryService } from '../ebird-query.service';
import * as mapboxgl from 'mapbox-gl';
import { SightingDetails } from '../ebird_sightings';
import { DateTime, Duration } from 'luxon';
import { Observable, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  map: mapboxgl.Map;
  days = 4;
  distanceRadius = 100;
  loaded = false;
  accessToken = environment.mapbox.accessToken;
  ebirdSightings$: Observable<GeoJSON.FeatureCollection<GeoJSON.Geometry>>;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
  selectedPoint: mapboxgl.MapboxGeoJSONFeature;
  home: mapboxgl.LngLat;

  constructor(private ebirdQuery: EbirdQueryService) {}

  ngOnInit() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        this.home = new mapboxgl.LngLat(lng, lat);
      });
    }
  }

  onMapLoad(event: mapboxgl.Map) {
    this.map = event;
    this.goHome();
  }

  displaySightings() {
    this.ebirdSightings$ = this.ebirdQuery
      .getRecentNotable()
      .pipe(
        map((locationSightings) =>
          this.processLocationSightings(locationSightings)
        )
      );
  }

  getDisplayDays(days: number) {
    if (days === 0) {
      return 'Today only';
    } else if (days === 1) {
      return 'Since yesterday';
    } else {
      return 'Last ' + days + ' days';
    }
  }

  onPointsClick(evt: mapboxgl.MapLayerMouseEvent) {
    this.selectedPoint = evt.features[0];
  }

  goHome() {
    if (this.map) {
      this.map.jumpTo({ center: this.home });
      this.loadSightings(this.home);
    }
  }

  onReloadSightings() {
    if (this.map) {
      this.loadSightings(this.map.getCenter());
    }
  }

  loadSightings(center: mapboxgl.LngLat) {
    this.loaded = false;
    const lngRad = (center.lng * Math.PI) / 180;
    const latRad = (center.lat * Math.PI) / 180;
    const distanceRadians = this.distanceRadius / 6356;
    const radiusPoints = [];
    for (let i = 0; i <= 100; i++) {
      const angle = (2 * Math.PI * i) / 100;
      const newLat = Math.asin(
        Math.sin(latRad) * Math.cos(distanceRadians) +
          Math.cos(latRad) * Math.sin(distanceRadians) * Math.cos(angle)
      );
      const newLon =
        lngRad +
        Math.atan2(
          Math.sin(angle) * Math.sin(distanceRadians) * Math.cos(latRad),
          Math.cos(distanceRadians) - Math.sin(latRad) * Math.sin(newLat)
        );
      radiusPoints.push([(newLon * 180) / Math.PI, (newLat * 180) / Math.PI]);
    }
    this.geometry = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [radiusPoints],
      },
      properties: {},
    };
    this.ebirdQuery.loadSightings(this.map.getCenter(), this.distanceRadius);
    this.displaySightings();
  }

  processLocationSightings(
    locationSightings: Map<string, SightingDetails[]>
  ): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
    const features: GeoJSON.Feature<GeoJSON.Geometry>[] = [];
    const startOfToday: DateTime = DateTime.local().startOf('day');
    // Plot each location's sightings on the map.
    locationSightings.forEach((sightings) => {
      // Sort sightings by date, and filter sightings that are too old.
      sightings.sort(
        (a: SightingDetails, b: SightingDetails) =>
          b.dateTime.diff(a.dateTime).milliseconds
      );
      sightings = sightings.filter(
        (a) =>
          startOfToday.diff(a.dateTime.startOf('day')) <=
          Duration.fromObject({ days: this.days })
      );

      // If there are sightings for this location that were not filtered out, build up the display
      // message.
      if (sightings.length > 0) {
        // Calculate the number of days ago that the most recent sighting occured, and get the
        // timeAgoCategory, which lets us display different colors for different categories.
        const timeAgoDays: number = startOfToday
          .diff(sightings[0].dateTime.startOf('day'))
          .as('days');
        const timeAgoCategory: string = (() => {
          if (timeAgoDays < 1) {
            return 'today';
          } else if (timeAgoDays < 2) {
            return 'yesterday';
          } else {
            return 'old';
          }
        })();

        // Prepare to build up a list of the species seen in a particular location and a display
        // message for the popup.
        interface SpeciesDetails {
          hasPhoto: boolean;
        }
        const speciesSeen: Map<string, SpeciesDetails> = new Map<
          string,
          SpeciesDetails
        >();
        let description: string = '<h2>' + sightings[0].obs.locName + '</h2>';
        const sightingsLength = sightings.length;
        sightings = sightings.filter(
          (sighting: SightingDetails, index: number, self: SightingDetails[]) =>
            index ===
            self.findIndex(
              (s) =>
                s.obs.obsId === sighting.obs.obsId &&
                s.obs.speciesCode === sighting.obs.speciesCode
            )
        );
        sightings.forEach((sighting: SightingDetails) => {
          description = description + sighting.description + '<br>';
          if (!speciesSeen.has(sighting.obs.comName)) {
            speciesSeen.set(sighting.obs.comName, {
              hasPhoto: sighting.obs.hasRichMedia,
            });
          } else {
            speciesSeen.get(sighting.obs.comName).hasPhoto =
              speciesSeen.get(sighting.obs.comName).hasPhoto ||
              sighting.obs.hasRichMedia;
          }
        });

        // The title that is displayed on the map is a (de-duplicated) list of species.
        const speciesSeenDisplayName: string[] = [];
        speciesSeen.forEach((properties, species, map) => {
          speciesSeenDisplayName.push(
            species + (properties.hasPhoto ? ' (P)' : '')
          );
        });
        const title: string = [...speciesSeenDisplayName].join(',\n');
        const newFeature: GeoJSON.Feature<GeoJSON.Geometry> = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [sightings[0].obs.lng, sightings[0].obs.lat],
          },
          properties: {
            title,
            description,
            timeAgoCategory,
          },
        };
        features.push(newFeature);
      }
    });
    this.loaded = true;
    return {
      type: 'FeatureCollection',
      features,
    };
  }
}
