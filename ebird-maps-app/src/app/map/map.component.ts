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
  days = 4;
  accessToken = environment.mapbox.accessToken;

  constructor() {}

  onSliderInput(e: MatSliderChange) {
    this.days = e.value;
  }

  onSliderChange(e: MatSliderChange) {
    this.days = e.value;
  }
}
