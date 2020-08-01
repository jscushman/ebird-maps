import { TestBed } from '@angular/core/testing';

import { GetSummaryStatsService } from './get-summary-stats.service';

describe('GetSummaryStatsService', () => {
  let service: GetSummaryStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetSummaryStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
