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
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CountiesData extends Objects<Properties> {
  counties: GeometryCollection<GeometryObject<Properties>>;
}

export class CountySpeciesList {
  county: string;
  state: string;
  speciesSet: Set<string>;

  constructor(county: string, state: string) {
    this.county = county;
    this.state = state;
    this.speciesSet = new Set<string>();
  }
}

export class CountySpeciesCount {
  county: string;
  speciesCount: number;

  constructor(county: string, speciesCount: number) {
    this.county = county;
    this.speciesCount = speciesCount;
  }
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
  speciesPerCounty$: Observable<Map<string, CountySpeciesList>>;
  countyFipsCodes$: Observable<Map<string, string>>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.speciesPerCounty$ = this.http
      .get('assets/MyEBirdData.csv', { responseType: 'text' })
      .pipe(
        map((data) => {
          const speciesPerCounty = new Map<string, CountySpeciesList>();
          const csvToRowArray: string[] = data.split('\n');
          for (let index = 1; index < csvToRowArray.length - 1; index++) {
            const row: string[] = csvToRowArray[index].split(',');
            const speciesRowName = row[2];
            if (
              speciesRowName.includes('sp.') ||
              speciesRowName.includes(' x ') ||
              speciesRowName.includes('(Domestic type)')
            ) {
              continue;
            }
            const speciesName = speciesRowName.split(' ').slice(0, 2).join(' ');
            if (speciesName.includes('/')) {
              continue;
            }
            const county = row[6];
            const state = row[5];
            if (!speciesPerCounty.has(state + county)) {
              speciesPerCounty.set(
                state + county,
                new CountySpeciesList(county, state)
              );
            }
            speciesPerCounty.get(state + county).speciesSet.add(speciesName);
          }
          return speciesPerCounty;
        })
      );

    this.countyFipsCodes$ = this.http.get('assets/fips_codes.json', {
      responseType: 'json',
    }) as Observable<Map<string, string>>;

    forkJoin([this.speciesPerCounty$, this.countyFipsCodes$]).subscribe(
      ([speciesPerCounty, countyFipsCodes]) => {
        // Calculate number of species per county, indexed by FIPS code, and compute the maximum
        // value for the color scale.
        const sightings = new Map<string, CountySpeciesCount>();
        let maxNumSpecies = 0;
        for (const [county, countySpecies] of speciesPerCounty.entries()) {
          const numSpecies = countySpecies.speciesSet.size;
          sightings.set(
            countyFipsCodes[countySpecies.state + countySpecies.county],
            new CountySpeciesCount(countySpecies.county, numSpecies)
          );
          if (numSpecies > maxNumSpecies) {
            maxNumSpecies = numSpecies;
          }
        }

        // Load the US topology.
        const us: Topology<CountiesData> = require('../../../node_modules/us-atlas/counties-albers-10m.json');

        // Draw the map. Shade each county by the number of species in the county.
        const colorScale = d3
          .scaleSequential(d3.interpolateYlOrRd)
          .domain([0, maxNumSpecies]);
        const path = d3.geoPath();
        const svg = d3.select('svg');
        svg
          .append('g')
          .attr('class', 'counties')
          .selectAll('path')
          .data(topojson.feature(us, us.objects.counties).features)
          .enter()
          .append('path')
          .attr('fill', (d) => {
            return sightings.has(d.id.toString())
              ? colorScale(sightings.get(d.id.toString()).speciesCount)
              : 'none';
          })
          .attr('stroke', (d) => {
            return sightings.has(d.id.toString()) ? 'lightgray' : 'none';
          })
          .attr('stroke-width', 0.3)
          .attr('d', path)
          .append('title')
          .text((d) => {
            const countySpeciesCount = sightings.get(d.id.toString());
            return sightings.has(d.id.toString())
              ? countySpeciesCount.county +
                  ': ' +
                  countySpeciesCount.speciesCount
              : '';
          });

        // Draw state outlines.
        svg
          .append('path')
          .attr('fill', (d) => {
            return 'none';
          })
          .attr('stroke', (d) => {
            return '#aaa';
          })
          .datum(topojson.mesh(us, us.objects.states))
          .attr('class', 'states')
          .attr('d', path);

        // Draw legend.
        this.drawLegend(maxNumSpecies);
      }
    );
  }

  drawLegend(maxNumSpecies: number) {
    const svg = d3.select('svg');
    const gLegend = svg
      .append('g')
      .attr('class', 'key')
      .attr('transform', 'translate(0,40)');

    const legendWidth = 260;
    const legendDivisions = 50;
    const legendSectionWidth = Math.floor(legendWidth / legendDivisions);

    const legendLocations = [];
    for (let i = 0; i < legendWidth; i += legendSectionWidth) {
      legendLocations.push(i);
    }

    const legendColorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, legendDivisions]);

    const axisScale = d3
      .scaleLinear()
      .domain([0, 100])
      .rangeRound([600, 600 + legendWidth]);

    gLegend
      .selectAll('rect')
      .data(legendLocations)
      .enter()
      .append('rect')
      .attr('height', 8)
      .attr('x', (d, i) => {
        return axisScale.range()[0] + legendSectionWidth * i;
      })
      .attr('width', (d, i) => {
        return legendSectionWidth;
      })
      .attr('fill', (d, i) => {
        return legendColorScale(i);
      });

    gLegend
      .append('text')
      .attr('class', 'caption')
      .attr('x', axisScale.range()[0])
      .attr('y', -6)
      .attr('fill', '#000')
      .attr('text-anchor', 'start')
      .attr('font-weight', 'bold')
      .text('Species per county');

    const ticks = 5;
    gLegend
      .call(
        d3
          .axisBottom(axisScale)
          .tickSize(13)
          .tickFormat((x, i) => {
            return ((i * maxNumSpecies) / (ticks - 1)).toString();
          })
          .tickValues([0, 25, 50, 75, 100])
      )
      .select('.domain')
      .remove();
  }
}
