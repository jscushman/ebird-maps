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
  userDisplayName?: string;
  obsReviewed?: boolean;
  hasRichMedia?: boolean;
}

export interface SightingDetails {
  obs: Observation;
  dateTime: DateTime;
  description: string;
}
