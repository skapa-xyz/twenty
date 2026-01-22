import styled from '@emotion/styled';
import { Marker } from 'react-map-gl';
import type { Property } from '../types/property-map.types';

const StyledMarkerContainer = styled.div<{ isSelected?: boolean; status: string }>`
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  transform: ${({ isSelected }) => (isSelected ? 'scale(1.1)' : 'scale(1)')};
  z-index: ${({ isSelected }) => (isSelected ? 1000 : 1)};

  &:hover {
    transform: scale(1.15);
    z-index: 999;
  }
`;

const StyledMarkerPin = styled.div<{ status: string; isSelected?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing(1)} ${theme.spacing(2)}`};
  background: ${({ status, theme }) => {
    switch (status) {
      case 'on_market':
        return theme.color.green;
      case 'off_market':
        return theme.color.blue;
      case 'pre_market':
        return theme.color.orange;
      case 'sold':
        return theme.color.red;
      case 'withdrawn':
        return theme.grayScale.gray40;
      default:
        return theme.grayScale.gray50;
    }
  }};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  box-shadow: ${({ theme, isSelected }) =>
    isSelected
      ? `0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 3px ${theme.background.primary}`
      : '0 2px 8px rgba(0, 0, 0, 0.2)'};
  border: ${({ theme, isSelected }) =>
    isSelected ? `2px solid ${theme.background.primary}` : '2px solid rgba(255, 255, 255, 0.9)'};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.inverted};
  white-space: nowrap;
  min-width: 60px;

  /* Arrow pointing down */
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid
      ${({ status, theme }) => {
        switch (status) {
          case 'on_market':
            return theme.color.green;
          case 'off_market':
            return theme.color.blue;
          case 'pre_market':
            return theme.color.orange;
          case 'sold':
            return theme.color.red;
          case 'withdrawn':
            return theme.grayScale.gray40;
          default:
            return theme.grayScale.gray50;
        }
      }};
  }
`;

const StyledPriceText = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

export interface PropertyMapMarkerProps {
  property: Property;
  isSelected?: boolean;
  onClick: (property: Property) => void;
}

export const PropertyMapMarker = ({ property, isSelected = false, onClick }: PropertyMapMarkerProps) => {
  const formatPrice = (price?: number | null): string => {
    if (!price) return 'POA';

    // Format price in abbreviated form
    if (price >= 1000000) {
      const millions = price / 1000000;
      return `$${millions.toFixed(millions >= 10 ? 1 : 2)}M`;
    }
    if (price >= 1000) {
      const thousands = price / 1000;
      return `$${thousands.toFixed(0)}K`;
    }
    return `$${price.toLocaleString()}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(property);
  };

  return (
    <Marker
      latitude={property.latitude}
      longitude={property.longitude}
      anchor="bottom"
      onClick={handleClick}
    >
      <StyledMarkerContainer isSelected={isSelected} status={property.listingStatus}>
        <StyledMarkerPin status={property.listingStatus} isSelected={isSelected}>
          <StyledPriceText>{formatPrice(property.askingPrice)}</StyledPriceText>
        </StyledMarkerPin>
      </StyledMarkerContainer>
    </Marker>
  );
};
