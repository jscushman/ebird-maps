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
