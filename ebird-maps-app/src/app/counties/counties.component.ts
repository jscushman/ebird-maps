import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import * as d3 from 'd3';
import * as GeoJSON from 'geojson';
import { FileSystemFileEntry, NgxFileDropEntry } from 'ngx-file-drop';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as topojson from 'topojson-client';

import {
  CountiesData,
  CountiesTopojsonService,
  Topology,
} from '../counties-topojson.service';
import {
  CountyDisplayRow,
  CountySpeciesCount,
  StateDisplayRow,
  SummaryStatsService,
} from '../summary-stats.service';

@Component({
  selector: 'app-counties',
  templateUrl: './counties.component.html',
  styleUrls: ['./counties.component.css'],
})
export class CountiesComponent implements AfterViewInit {
  speciesPerCountyDisplayTable$: Observable<
    MatTableDataSource<CountyDisplayRow>
  >;
  speciesPerStateDisplayTable$: Observable<MatTableDataSource<StateDisplayRow>>;

  @ViewChild('countySort') countySort: MatSort;
  @ViewChild('stateSort') stateSort: MatSort;

  constructor(
    private summaryStatsService: SummaryStatsService,
    private countiesTopojsonService: CountiesTopojsonService
  ) {}

  ngAfterViewInit(): void {
    const speciesPerCountyTable$ = this.summaryStatsService.getSpeciesPerCountyTable();
    const speciesPerStateTable$ = this.summaryStatsService.getSpeciesPerStateTable();

    this.speciesPerCountyDisplayTable$ = speciesPerCountyTable$.pipe(
      map((speciesPerCountyTable) => {
        const dataSource = new MatTableDataSource(speciesPerCountyTable);
        dataSource.sort = this.countySort;
        return dataSource;
      })
    );

    this.speciesPerStateDisplayTable$ = speciesPerStateTable$.pipe(
      map((speciesPerStateTable) => {
        const dataSource = new MatTableDataSource(speciesPerStateTable);
        dataSource.sort = this.stateSort;
        return dataSource;
      })
    );

    speciesPerCountyTable$.subscribe((speciesPerCountyTable) => {
      // Calculate number of species per county, indexed by FIPS code, and compute the maximum
      // value for the color scale.
      const sightings = new Map<string, CountySpeciesCount>();
      let maxNumSpecies = 0;
      speciesPerCountyTable.forEach((element) => {
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
      const us: Topology<CountiesData> = this.countiesTopojsonService.getUsCountiesTopojson();

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

  public onFileDropped(files: NgxFileDropEntry[]) {
    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          const myReader: FileReader = new FileReader();
          myReader.onloadend = (e) => {
            this.summaryStatsService.loadFromFile(myReader.result as string);
          };
          myReader.readAsText(file);
        });
        return;
      }
    }
  }
}
