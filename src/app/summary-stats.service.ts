import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as iso3166 from 'iso-3166-2';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, share } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root',
})
export class SummaryStatsService {
  private speciesLists$: Subject<SpeciesLists>;
  private speciesPerCountyTable$: Observable<CountyDisplayRow[]>;
  private speciesPerStateTable$: Observable<StateDisplayRow[]>;

  constructor(private http: HttpClient) {
    this.speciesLists$ = new Subject<SpeciesLists>();

    const countyFipsCodes$ = this.http.get('assets/fips_codes.json', {
      responseType: 'json',
    }) as Observable<Map<string, string>>;

    const speciesPerCountyTable$ = combineLatest([
      this.speciesLists$,
      countyFipsCodes$,
    ]).pipe(
      map(([speciesLists, countyFipsCodes]) => {
        const tableEntries: CountyDisplayRow[] = [];
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
        return tableEntries;
      })
    );
    this.speciesPerCountyTable$ = speciesPerCountyTable$.pipe(share());

    const speciesPerStateTable$ = this.speciesLists$.pipe(
      map((speciesLists) => {
        const tableEntries: StateDisplayRow[] = [];
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
        return tableEntries;
      })
    );
    this.speciesPerStateTable$ = speciesPerStateTable$.pipe(share());
  }

  loadFromFile(fileContents: string) {
    const speciesLists = new SpeciesLists();
    const csvToRowArray: string[] = fileContents.split('\n');
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
      speciesLists.countyLists.get(state + county).speciesSet.add(speciesName);
      speciesLists.stateLists.get(state).speciesSet.add(speciesName);
    }
    this.speciesLists$.next(speciesLists);
  }

  getSpeciesPerCountyTable() {
    return this.speciesPerCountyTable$;
  }

  getSpeciesPerStateTable() {
    return this.speciesPerStateTable$;
  }
}
