import { TestBed } from '@angular/core/testing';

import { CountiesTopojsonService } from './counties-topojson.service';

describe('CountiesTopojsonService', () => {
  let service: CountiesTopojsonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CountiesTopojsonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
