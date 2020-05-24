import { environment } from '../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { MatSliderChange } from '@angular/material/slider';
import * as mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent {
  map: mapboxgl.Map;
  days = 4;
  distanceRadius = 100;
  accessToken = environment.mapbox.accessToken;
  ebirdSightings: GeoJSON.FeatureCollection<GeoJSON.Geometry>;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
  showSightings: boolean;
  showSearchRadius: boolean;

  constructor() {
    this.showSightings = false;
    this.ebirdSightings = {
      type: 'FeatureCollection',
      features: [],
    };
  }

  onSliderInput(e: MatSliderChange) {
    this.days = e.value;
  }

  onSliderChange(e: MatSliderChange) {}

  getDisplayDays(days: number) {
    if (days === 0) {
      return 'Today only';
    } else if (days === 1) {
      return 'Since yesterday';
    } else {
      return 'Last ' + days + ' days';
    }
  }

  onLoadClicked() {
    const center: mapboxgl.LngLat = this.map.getCenter();
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
  }
}
