import { atom } from 'recoil';

export type MapViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export const mapViewportState = atom<MapViewport>({
  key: 'property-map/mapViewportState',
  default: {
    latitude: -33.8688, // Sydney default
    longitude: 151.2093,
    zoom: 11,
  },
});
