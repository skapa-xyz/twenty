import { atom } from 'recoil';

export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export const mapBoundsState = atom<MapBounds | null>({
  key: 'property-map/mapBoundsState',
  default: null,
});
