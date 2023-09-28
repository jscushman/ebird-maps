import { DateTime } from 'luxon';

export interface Observation {
  obsDt: string;
  obsId: string;
  locId: string;
  locName: string;
  speciesCode: string;
  comName: string;
  howMany: number;
  lng: number;
  lat: number;
  subId: string;
  subnational1Name: string;
  subnational1Code: string;
  subnational2Name: string;
  subnational2Code: string;
  userDisplayName?: string;
  obsReviewed?: boolean;
  hasRichMedia?: boolean;
  locationPrivate: boolean;
}

export interface SightingDetails {
  obs: Observation;
  dateTime: DateTime;
  description: string;
}
