import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Observation, SightingDetails } from './ebird_sightings';
import * as mapboxgl from 'mapbox-gl';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class EbirdQueryService {
  private eBirdApiUrl =
    'https://api.jscushman.com/queryRecentNearbyNotableEbirdApi/queryRecentNearbyNotableEbirdApi';
  private observations = new BehaviorSubject<Map<string, SightingDetails[]>>(
    new Map<string, SightingDetails[]>()
  );

  constructor(private http: HttpClient) {}

  loadSightings(lngLat: mapboxgl.LngLat, distanceRadius: number) {
    const params = new HttpParams()
      .set('lng', lngLat.lng.toString())
      .set('lat', lngLat.lat.toString())
      .set('back', '7')
      .set('dist', distanceRadius.toString());
    this.http
      .get<Observation[]>(this.eBirdApiUrl, {
        params,
      })
      .subscribe((o: Observation[]) => {
        this.observations.next(this.groupRecentNotableByLoc(o));
      });
  }

  getRecentNotable(): Observable<Map<string, SightingDetails[]>> {
    return this.observations.asObservable();
  }

  reemitObservations() {
    this.observations.next(this.observations.value);
  }

  private groupRecentNotableByLoc(
    observations: Observation[]
  ): Map<string, SightingDetails[]> {
    const locationSightings = new Map<string, SightingDetails[]>();
    for (const obs of observations) {
      const dateTime = DateTime.fromFormat(obs.obsDt, 'yyyy-LL-dd HH:mm');
      let description =
        '<b><a href="https://ebird.org/species/' +
        obs.speciesCode +
        '/' +
        obs.subnational2Code +
        '" target="_blank">' +
        obs.comName +
        '</a>' +
        (obs.howMany > 1 ? ' (' + obs.howMany + ')' : '') +
        '</b> observed <b>' +
        dateTime.toRelativeCalendar() +
        '</b> ';
      if (obs.hasOwnProperty('subId')) {
        description =
          description +
          '(<a href="https://ebird.org/view/checklist/' +
          obs.subId +
          '" target="_blank">' +
          obs.obsDt +
          '</a>) ';
      } else {
        description = description + '(' + obs.obsDt + ') ';
      }
      if (obs.hasOwnProperty('userDisplayName')) {
        description =
          description +
          'by ' +
          obs.userDisplayName +
          (obs.obsReviewed ? '' : ' (UNCONFIRMED)') +
          (obs.hasRichMedia ? ' (with media)' : '');
      }
      const sighting: SightingDetails = {
        obs,
        dateTime,
        description,
      };
      const loc: string = obs.locId;
      if (!locationSightings.has(loc)) {
        locationSightings.set(loc, [sighting]);
      } else {
        locationSightings.get(loc).push(sighting);
      }
    }
    return locationSightings;
  }
}
