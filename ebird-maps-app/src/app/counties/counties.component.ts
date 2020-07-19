import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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
import { Observable, combineLatest, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

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

export class CountyDisplayRow {
  county: string;
  state: string;
  speciesCount: number;

  constructor(county: string, state: string, speciesCount: number) {
    this.county = county;
    this.state = state;
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
export class CountiesComponent implements AfterViewInit {
  myEBirdData$: Observable<string>;
  speciesPerCounty$: Observable<Map<string, CountySpeciesList>>;
  speciesPerCountyTable$: Observable<MatTableDataSource<CountyDisplayRow[]>>;
  countyFipsCodes$: Observable<Map<string, string>>;
  stateAbbreviations$: Observable<Map<string, string>>;

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('fileInput') fileInput: ElementRef;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    console.log(this.fileInput);

    this.myEBirdData$ = fromEvent(this.fileInput.nativeElement, 'change').pipe(
      (source: Observable<Event>) =>
        new Observable<string>((observer) => {
          return source.subscribe((event: Event) => {
            const file: File = (event.target as HTMLInputElement).files[0];
            const myReader: FileReader = new FileReader();
            myReader.onloadend = (e) => {
              observer.next(myReader.result as string);
            };
            myReader.readAsText(file);
          });
        })
    );

    this.speciesPerCounty$ = this.myEBirdData$.pipe(
      map((data) => {
        const speciesPerCounty = new Map<string, CountySpeciesList>();
        const csvToRowArray: string[] = data.split('\n');
        for (let index = 1; index < csvToRowArray.length - 1; index++) {
          const row: string[] = csvToRowArray[index].split(',');
          if (row.length < 7) {
            // Malformed row. Skip.
            continue;
          }
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

    this.stateAbbreviations$ = this.http.get(
      'assets/state_abbreviations.json',
      {
        responseType: 'json',
      }
    ) as Observable<Map<string, string>>;

    this.speciesPerCountyTable$ = combineLatest([
      this.speciesPerCounty$,
      this.stateAbbreviations$,
    ]).pipe(
      map(([speciesPerCounty, stateAbbreviations]) => {
        const tableEntries = [];
        for (const countySpecies of speciesPerCounty.values()) {
          const numSpecies = countySpecies.speciesSet.size;
          if (countySpecies.county !== '') {
            tableEntries.push(
              new CountyDisplayRow(
                countySpecies.county,
                countySpecies.state in stateAbbreviations
                  ? stateAbbreviations[countySpecies.state]
                  : countySpecies.state,
                numSpecies
              )
            );
          }
        }
        tableEntries.sort((a, b) => (a.speciesCount < b.speciesCount ? 1 : -1));
        const dataSource = new MatTableDataSource(tableEntries);
        dataSource.sort = this.sort;
        return dataSource;
      })
    );

    combineLatest([this.speciesPerCounty$, this.countyFipsCodes$]).subscribe(
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
        d3.selectAll('svg > *').remove();
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
          .attr('stroke-width', 0.5)
          .datum(topojson.mesh(us, us.objects.states))
          .attr('class', 'states')
          .attr('d', path);

        // Draw legend.
        this.drawLegend(maxNumSpecies);

        // Add in zoom capabilities.
        const zoom = d3
          .zoom()
          .scaleExtent([1, 8])
          .on('zoom', () => {
            svg
              .selectAll('path') // To prevent stroke width from scaling
              .attr('transform', d3.event.transform);
          });
        svg.call(zoom);
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
