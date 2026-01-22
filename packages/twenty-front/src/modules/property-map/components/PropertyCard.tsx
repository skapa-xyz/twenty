import styled from '@emotion/styled';
import { IconBath, IconBed, IconCar, IconRuler } from 'twenty-ui/display';

import type { Property } from '../types/property-map.types';

const StyledCard = styled.div<{ compact?: boolean; clickable?: boolean }>`
  background: ${({ theme }) => theme.background.primary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  overflow: hidden;
  width: ${({ compact }) => (compact ? '250px' : '100%')};
  box-shadow: ${({ theme }) => theme.boxShadow.light};
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  transition: ${({ theme }) => theme.clickableElementBackgroundTransition};

  &:hover {
    ${({ clickable, theme }) =>
      clickable &&
      `
      box-shadow: ${theme.boxShadow.strong};
      transform: translateY(-2px);
    `}
  }
`;

const StyledImage = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
`;

const StyledPlaceholder = styled.div`
  width: 100%;
  height: 140px;
  background: ${({ theme }) => theme.background.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.font.color.light};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const StyledContent = styled.div`
  padding: ${({ theme }) => theme.spacing(3)};
`;

const StyledAddress = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing(2)} 0;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const StyledPrice = styled.div`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.color.blue};
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

const StyledAttributes = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const StyledAttribute = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledStatus = styled.span<{ status: string }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing(1)} ${theme.spacing(2)}`};
  border-radius: ${({ theme }) => theme.border.radius.pill};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing(2)};
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
        return theme.color.gray;
      default:
        return theme.background.tertiary;
    }
  }};
  color: ${({ theme }) => theme.font.color.inverted};
`;

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
  onClick?: (property: Property) => void;
}

export const PropertyCard = ({
  property,
  compact = false,
  onClick,
}: PropertyCardProps) => {
  const formatPrice = (price?: number | null) => {
    if (!price) return 'Price on Application';
    return `$${price.toLocaleString()}`;
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ');
  };

  const handleClick = () => {
    if (onClick) {
      onClick(property);
    }
  };

  return (
    <StyledCard
      compact={compact}
      clickable={!!onClick}
      onClick={handleClick}
      data-testid={`property-card-${property.id}`}
    >
      {property.photos?.[0] ? (
        <StyledImage src={property.photos[0]} alt={property.addressDisplay} />
      ) : (
        <StyledPlaceholder>No Image</StyledPlaceholder>
      )}

      <StyledContent>
        <StyledStatus status={property.listingStatus}>
          {formatStatus(property.listingStatus)}
        </StyledStatus>

        <StyledAddress>{property.addressDisplay}</StyledAddress>

        <StyledPrice>{formatPrice(property.askingPrice)}</StyledPrice>

        <StyledAttributes>
          {property.attributes?.bedrooms !== undefined && (
            <StyledAttribute>
              <IconBed size={16} />
              {property.attributes.bedrooms}
            </StyledAttribute>
          )}
          {property.attributes?.bathrooms !== undefined && (
            <StyledAttribute>
              <IconBath size={16} />
              {property.attributes.bathrooms}
            </StyledAttribute>
          )}
          {property.attributes?.carSpaces !== undefined && (
            <StyledAttribute>
              <IconCar size={16} />
              {property.attributes.carSpaces}
            </StyledAttribute>
          )}
          {property.landSize !== undefined && property.landSize !== null && (
            <StyledAttribute>
              <IconRuler size={16} />
              {property.landSize}m²
            </StyledAttribute>
          )}
        </StyledAttributes>
      </StyledContent>
    </StyledCard>
  );
};
