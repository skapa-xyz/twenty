import { useCallback, useMemo, useRef } from 'react';
import Map, { Layer, MapLayerMouseEvent, MapRef, Source } from 'react-map-gl';
import type { ViewState } from 'react-map-gl';
import styled from '@emotion/styled';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE, CLUSTER_MAX_ZOOM, CLUSTER_RADIUS } from '../constants/map-config.constants';
import type { Property, PropertyGeoJSONFeatureCollection } from '../types/property-map.types';

const StyledMapWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

interface PropertyMapCanvasProps {
  properties: Property[];
  viewState: Partial<ViewState>;
  onViewStateChange: (viewState: Partial<ViewState>) => void;
  onPropertyClick?: (property: Property) => void;
  onClusterClick?: (clusterId: number, latitude: number, longitude: number) => void;
}

export const PropertyMapCanvas = ({
  properties,
  viewState,
  onViewStateChange,
  onPropertyClick,
  onClusterClick,
}: PropertyMapCanvasProps) => {
  const mapRef = useRef<MapRef>(null);

  // Convert properties to GeoJSON format for clustering
  const geoJsonData: PropertyGeoJSONFeatureCollection = useMemo(() => ({
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
        price: property.askingPrice,
        bedrooms: property.attributes?.bedrooms,
        bathrooms: property.attributes?.bathrooms,
        status: property.listingStatus,
        photo: property.photos?.[0],
      },
    })),
  }), [properties]);

  // Layer configuration for clusters (circles with count)
  const clusterLayer = useMemo(() => ({
    id: 'clusters',
    type: 'circle' as const,
    source: 'properties',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#51bbd6', // < 10 properties: light blue
        10,
        '#f1f075', // 10-50 properties: yellow
        50,
        '#f28cb1', // > 50 properties: pink
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20, // < 10 properties: 20px radius
        10,
        30, // 10-50 properties: 30px radius
        50,
        40, // > 50 properties: 40px radius
      ],
    },
  }), []);

  // Layer configuration for cluster count labels
  const clusterCountLayer = useMemo(() => ({
    id: 'cluster-count',
    type: 'symbol' as const,
    source: 'properties',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
  }), []);

  // Layer configuration for unclustered individual property markers
  const unclusteredPointLayer = useMemo(() => ({
    id: 'unclustered-point',
    type: 'circle' as const,
    source: 'properties',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'status'],
        'on_market', '#22c55e', // green
        'off_market', '#3b82f6', // blue
        'pre_market', '#f59e0b', // orange
        'sold', '#ef4444', // red
        '#6b7280', // gray - default
      ],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  }), []);

  // Handle clicks on the map
  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ['clusters', 'unclustered-point'],
    });

    if (!features.length) return;

    const feature = features[0];

    // Check if this is a cluster
    if (feature.layer.id === 'clusters' && feature.properties?.cluster_id) {
      const clusterId = feature.properties.cluster_id;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (onClusterClick) {
        onClusterClick(clusterId, coordinates[1], coordinates[0]);
      }

      // Zoom to cluster
      const source = map.getSource('properties') as mapboxgl.GeoJSONSource;
      if (source && source.getClusterExpansionZoom) {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;

          map.easeTo({
            center: coordinates,
            zoom: zoom || (viewState.zoom || 11) + 2,
            duration: 500,
          });
        });
      }
    }
    // Check if this is an individual property marker
    else if (feature.layer.id === 'unclustered-point' && feature.properties?.id) {
      const propertyId = feature.properties.id;
      const property = properties.find((p) => p.id === propertyId);

      if (property && onPropertyClick) {
        onPropertyClick(property);
      }
    }
  }, [properties, onPropertyClick, onClusterClick, viewState.zoom]);

  // Handle mouse cursor changes on hover
  const handleMouseEnter = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      map.getCanvas().style.cursor = 'pointer';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      map.getCanvas().style.cursor = '';
    }
  }, []);

  return (
    <StyledMapWrapper>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => onViewStateChange(evt.viewState)}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={MAPBOX_STYLE}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
        interactiveLayerIds={['clusters', 'unclustered-point']}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
      </Map>
    </StyledMapWrapper>
  );
};
