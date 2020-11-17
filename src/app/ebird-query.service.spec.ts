import { TestBed } from '@angular/core/testing';

import { EbirdQueryService } from './ebird-query.service';

describe('EbirdQueryService', () => {
  let service: EbirdQueryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EbirdQueryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
