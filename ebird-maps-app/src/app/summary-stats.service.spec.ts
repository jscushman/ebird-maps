import { TestBed } from '@angular/core/testing';

import { SummaryStatsService } from './summary-stats.service';

describe('SummaryStatsService', () => {
  let service: SummaryStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SummaryStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
