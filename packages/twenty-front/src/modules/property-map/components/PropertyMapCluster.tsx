import styled from '@emotion/styled';
import { Marker } from 'react-map-gl';

const StyledClusterMarker = styled.div<{ pointCount: number }>`
  width: ${({ pointCount }) => {
    if (pointCount >= 100) return '50px';
    if (pointCount >= 50) return '45px';
    if (pointCount >= 10) return '40px';
    return '35px';
  }};
  height: ${({ pointCount }) => {
    if (pointCount >= 100) return '50px';
    if (pointCount >= 50) return '45px';
    if (pointCount >= 10) return '40px';
    return '35px';
  }};
  border-radius: 50%;
  background: ${({ theme, pointCount }) => {
    if (pointCount >= 100) return theme.color.blue70;
    if (pointCount >= 50) return theme.color.blue60;
    if (pointCount >= 10) return theme.color.blue50;
    return theme.color.blue40;
  }};
  border: 3px solid ${({ theme }) => theme.background.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: ${({ theme }) => theme.boxShadow.strong};

  &:hover {
    transform: scale(1.1);
    box-shadow: ${({ theme }) => theme.boxShadow.superHeavy};
    z-index: 1;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const StyledClusterCount = styled.span`
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  user-select: none;
`;

interface PropertyMapClusterProps {
  latitude: number;
  longitude: number;
  pointCount: number;
  onClick?: () => void;
}

/**
 * PropertyMapCluster component displays a cluster marker on the map
 * showing the count of properties grouped together at this location.
 *
 * Features:
 * - Size scales based on the number of properties in the cluster
 * - Color intensity increases with count
 * - Click to zoom into the cluster
 * - Hover effect for better UX
 * - Displays count number in center
 */
export const PropertyMapCluster = ({
  latitude,
  longitude,
  pointCount,
  onClick,
}: PropertyMapClusterProps) => {
  return (
    <Marker
      latitude={latitude}
      longitude={longitude}
      onClick={(e) => {
        // Prevent the click from propagating to the map
        e.originalEvent.stopPropagation();
        onClick?.();
      }}
    >
      <StyledClusterMarker pointCount={pointCount}>
        <StyledClusterCount>
          {pointCount >= 1000 ? `${Math.floor(pointCount / 1000)}k` : pointCount}
        </StyledClusterCount>
      </StyledClusterMarker>
    </Marker>
  );
};
