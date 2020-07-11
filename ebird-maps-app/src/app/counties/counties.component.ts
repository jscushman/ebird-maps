import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {
  GeometryObject,
  GeometryCollection,
  Topology,
  Objects,
  Properties,
} from 'topojson-specification';
import { HttpClient } from '@angular/common/http';

export interface CountiesData extends Objects<Properties> {
  counties: GeometryCollection<GeometryObject<Properties>>;
}

export class Sighting {
  scientificName: string;
  state: string;
  county: string;

  constructor(scientificName: string, state: string, county: string) {
    this.scientificName = scientificName;
    this.state = state;
    this.county = county;
  }
}

@Component({
  selector: 'app-counties',
  templateUrl: './counties.component.html',
  styleUrls: ['./counties.component.css'],
})
export class CountiesComponent implements OnInit {
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const sightingsPerFips = new Map<string, Set<string>>();

    this.http
      .get('assets/MyEBirdData.csv', { responseType: 'text' })
      .subscribe((data) => {
        const csvToRowArray: string[] = data.split('\n');
        for (let index = 1; index < csvToRowArray.length - 1; index++) {
          const row: string[] = csvToRowArray[index].split(',');
          const speciesName = row[2];
          const countyId = row[5] + row[6];
          if (!(countyId in sightingsPerFips)) {
            sightingsPerFips[countyId] = new Set<string>();
          }
          sightingsPerFips[countyId].add(speciesName);
        }
        console.log(sightingsPerFips);
      });

    const us: Topology<CountiesData> = require('../../../node_modules/us-atlas/counties-albers-10m.json');
    const path = d3.geoPath();
    const svg = d3.select('svg');
    svg
      .append('g')
      .attr('class', 'counties')
      .selectAll('path')
      .data(topojson.feature(us, us.objects.counties).features)
      .enter()
      .append('path')
      .attr('d', path);
  }
}
