import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import * as iso3166 from 'iso-3166-2';
import * as GeoJSON from 'geojson';

// Generic TopoJSON types.

export interface TopoJSON {
  type: 'Topology' | GeoJSON.GeoJsonGeometryTypes | null;
  bbox?: GeoJSON.BBox;
}

export interface Topology<
  T extends Objects<GeoJSON.GeoJsonProperties> = Objects<
    GeoJSON.GeoJsonProperties
  >
> extends TopoJSON {
  type: 'Topology';
  objects: T;
  arcs: number[][][];
}

export interface Objects<P extends GeoJSON.GeoJsonProperties = {}> {
  [key: string]: GeometryObject<P>;
}

export interface GeometryObjectA<P extends GeoJSON.GeoJsonProperties = {}>
  extends TopoJSON {
  type: GeoJSON.GeoJsonGeometryTypes | null;
  id?: number | string;
  properties?: P;
}

export type GeometryObject<
  P extends GeoJSON.GeoJsonProperties = {}
> = GeometryCollection<P>;

export interface GeometryCollection<P extends GeoJSON.GeoJsonProperties = {}>
  extends GeometryObjectA<P> {
  type: 'GeometryCollection';
  geometries: Array<GeometryObject<P>>;
}

// Specific types for this county map.

export interface CountiesData extends Objects<GeoJSON.GeoJsonProperties> {
  counties: GeometryCollection<GeometryObject<GeoJSON.GeoJsonProperties>>;
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

export class StateSpeciesList {
  state: string;
  speciesSet: Set<string>;

  constructor(state: string) {
    this.state = state;
    this.speciesSet = new Set<string>();
  }
}

export class SpeciesLists {
  countyLists: Map<string, CountySpeciesList>;
  stateLists: Map<string, StateSpeciesList>;

  constructor() {
    this.countyLists = new Map<string, CountySpeciesList>();
    this.stateLists = new Map<string, StateSpeciesList>();
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

export class StateSpeciesCount {
  state: string;
  speciesCount: number;

  constructor(state: string, speciesCount: number) {
    this.state = state;
    this.speciesCount = speciesCount;
  }
}

export class CountyDisplayRow {
  county: string;
  countyFips: string;
  state: string;
  country: string;
  speciesCount: number;

  constructor(
    county: string,
    countyFips: string,
    state: string,
    country: string,
    speciesCount: number
  ) {
    this.county = county;
    this.countyFips = countyFips;
    this.state = state;
    this.country = country;
    this.speciesCount = speciesCount;
  }
}

export class StateDisplayRow {
  state: string;
  country: string;
  speciesCount: number;

  constructor(state: string, country: string, speciesCount: number) {
    this.state = state;
    this.country = country;
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
  speciesLists$: Observable<SpeciesLists>;
  speciesPerCountyTable$: Observable<MatTableDataSource<CountyDisplayRow>>;
  speciesPerStateTable$: Observable<MatTableDataSource<StateDisplayRow>>;
  countyFipsCodes$: Observable<Map<string, string>>;

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('fileInput') fileInput: ElementRef;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
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

    this.speciesLists$ = this.myEBirdData$.pipe(
      map((data) => {
        const speciesLists = new SpeciesLists();
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
          const county = row[6].replace('St.', 'St');
          const state = row[5];
          if (!speciesLists.countyLists.has(state + county)) {
            speciesLists.countyLists.set(
              state + county,
              new CountySpeciesList(county, state)
            );
          }
          if (!speciesLists.stateLists.has(state)) {
            speciesLists.stateLists.set(state, new StateSpeciesList(state));
          }
          speciesLists.countyLists
            .get(state + county)
            .speciesSet.add(speciesName);
          speciesLists.stateLists.get(state).speciesSet.add(speciesName);
        }
        return speciesLists;
      })
    );

    this.countyFipsCodes$ = this.http.get('assets/fips_codes.json', {
      responseType: 'json',
    }) as Observable<Map<string, string>>;

    this.speciesPerCountyTable$ = combineLatest([
      this.speciesLists$,
      this.countyFipsCodes$,
    ]).pipe(
      map(([speciesLists, countyFipsCodes]) => {
        const tableEntries = [];
        for (const countySpecies of speciesLists.countyLists.values()) {
          const numSpecies = countySpecies.speciesSet.size;
          const countyFips =
            countyFipsCodes[countySpecies.state + countySpecies.county];
          const subdivision = iso3166.subdivision(countySpecies.state);
          if (countySpecies.county !== '') {
            tableEntries.push(
              new CountyDisplayRow(
                countySpecies.county,
                countyFips,
                subdivision ? subdivision.name : countySpecies.state,
                subdivision ? subdivision.countryName : countySpecies.state,
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

    this.speciesPerStateTable$ = this.speciesLists$.pipe(
      map((speciesLists) => {
        const tableEntries = [];
        for (const countySpecies of speciesLists.stateLists.values()) {
          const numSpecies = countySpecies.speciesSet.size;
          const subdivision = iso3166.subdivision(countySpecies.state);
          tableEntries.push(
            new StateDisplayRow(
              subdivision ? subdivision.name : countySpecies.state,
              subdivision ? subdivision.countryName : countySpecies.state,
              numSpecies
            )
          );
        }
        tableEntries.sort((a, b) => (a.speciesCount < b.speciesCount ? 1 : -1));
        const dataSource = new MatTableDataSource(tableEntries);
        dataSource.sort = this.sort;
        return dataSource;
      })
    );

    this.speciesPerCountyTable$.subscribe((speciesPerCountyTable) => {
      // Calculate number of species per county, indexed by FIPS code, and compute the maximum
      // value for the color scale.
      const sightings = new Map<string, CountySpeciesCount>();
      let maxNumSpecies = 0;
      speciesPerCountyTable.data.forEach((element) => {
        console.log(element);
        const numSpecies = element.speciesCount;
        sightings.set(
          element.countyFips,
          new CountySpeciesCount(element.county, numSpecies)
        );
        if (numSpecies > maxNumSpecies) {
          maxNumSpecies = numSpecies;
        }
      });

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
            ? countySpeciesCount.county + ': ' + countySpeciesCount.speciesCount
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
    });
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
