import { mapbox } from './mapbox.environment';

export const environment = {
  production: false,
  ...mapbox,
};
