import { mapbox } from './mapbox.environment.prod';

export const environment = {
  production: false,
  ...mapbox,
};
