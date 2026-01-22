import { useCallback, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl';
import type { ViewState } from 'react-map-gl';

import { usePropertyMapData } from '../hooks/usePropertyMapData';
import { PropertyMapSidebar } from './PropertyMapSidebar';
import { PropertyCard } from './PropertyCard';
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
} from '../constants/mapConfig';

import type { Property, PropertyGeoJSONCollection } from '../types/property-map.types';

// Import Mapbox GL CSS
import 'mapbox-gl/dist/mapbox-gl.css';

const StyledContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

const StyledMapWrapper = styled.div`
  flex: 1;
  position: relative;
`;

export type PropertyMapContainerProps = {
  recordMapInstanceId: string;
  viewBarInstanceId?: string;
  objectNameSingular: string;
};

export const PropertyMapContainer = ({
  recordMapInstanceId,
  objectNameSingular,
}: PropertyMapContainerProps) => {
  const [viewState, setViewState] = useState<ViewState>({
    latitude: DEFAULT_CENTER[0],
    longitude: DEFAULT_CENTER[1],
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<Property | null>(null);

  // Fetch properties within current viewport
  const bounds = useMemo(() => {
    // Calculate bounding box from viewport
    const latRange = 180 / Math.pow(2, viewState.zoom);
    const lngRange = 360 / Math.pow(2, viewState.zoom);

    return {
      minLat: viewState.latitude - latRange / 2,
      maxLat: viewState.latitude + latRange / 2,
      minLng: viewState.longitude - lngRange / 2,
      maxLng: viewState.longitude + lngRange / 2,
    };
  }, [viewState.latitude, viewState.longitude, viewState.zoom]);

  const { properties, loading } = usePropertyMapData(bounds);

  // Create GeoJSON for clustering
  const geoJsonData = useMemo<PropertyGeoJSONCollection>(() => ({
    type: 'FeatureCollection',
    features: properties.map((property) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [property.longitude, property.latitude] as [number, number],
      },
      properties: {
        id: property.id,
        address: property.addressDisplay,
        price: property.askingPrice ?? undefined,
        bedrooms: property.attributes?.bedrooms,
        bathrooms: property.attributes?.bathrooms,
        status: property.listingStatus,
        photo: property.photos?.[0],
      },
    })),
  }), [properties]);

  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  // Cluster layer configuration
  const clusterLayer = {
    id: 'clusters',
    type: 'circle' as const,
    source: 'properties',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#51bbd6',
        10,
        '#f1f075',
        50,
        '#f28cb1',
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        10,
        30,
        50,
        40,
      ],
    },
  };

  // Cluster count layer configuration
  const clusterCountLayer = {
    id: 'cluster-count',
    type: 'symbol' as const,
    source: 'properties',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
  };

  // Unclustered point layer configuration
  const unclusteredPointLayer = {
    id: 'unclustered-point',
    type: 'circle' as const,
    source: 'properties',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'status'],
        'on_market', '#22c55e',
        'off_market', '#3b82f6',
        'pre_market', '#f59e0b',
        'sold', '#ef4444',
        '#6b7280', // default
      ],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  };

  return (
    <StyledContainer>
      <StyledMapWrapper>
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={MAPBOX_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />

          <Source
            id="properties"
            type="geojson"
            data={geoJsonData}
            cluster={true}
            clusterMaxZoom={CLUSTER_MAX_ZOOM}
            clusterRadius={CLUSTER_RADIUS}
          >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredPointLayer} />
          </Source>

          {hoveredProperty && (
            <Popup
              latitude={hoveredProperty.latitude}
              longitude={hoveredProperty.longitude}
              closeButton={false}
              anchor="bottom"
            >
              <PropertyCard property={hoveredProperty} compact />
            </Popup>
          )}
        </Map>
      </StyledMapWrapper>

      {selectedProperty && (
        <PropertyMapSidebar
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </StyledContainer>
  );
};
