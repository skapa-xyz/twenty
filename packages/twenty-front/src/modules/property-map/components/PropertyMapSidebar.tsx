import styled from '@emotion/styled';
import { IconX, IconEye, IconPlus, IconBed, IconBath, IconCar, IconRuler } from 'twenty-ui/display';
import { LightIconButton } from 'twenty-ui/input';
import { Button } from 'twenty-ui/input';
import type { Property } from '../types/property-map.types';

const StyledSidebar = styled.div`
  width: 400px;
  height: 100%;
  background: ${({ theme }) => theme.background.primary};
  border-left: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(4)};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
`;

const StyledTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing(4)};
`;

const StyledSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing(6)};
`;

const StyledSectionTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing(3)} 0;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledAddress = styled.div`
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

const StyledPrice = styled.div`
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  color: ${({ theme }) => theme.color.blue};
  margin-bottom: ${({ theme }) => theme.spacing(4)};
`;

const StyledStatus = styled.span<{ status: string }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing(1)} ${theme.spacing(2)}`};
  border-radius: ${({ theme }) => theme.border.radius.pill};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-transform: uppercase;
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
      default:
        return theme.background.tertiary;
    }
  }};
  color: white;
  margin-bottom: ${({ theme }) => theme.spacing(4)};
`;

const StyledAttributes = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing(3)};
  margin-bottom: ${({ theme }) => theme.spacing(4)};
`;

const StyledAttribute = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: ${({ theme }) => theme.font.size.md};
`;

const StyledAttributeLabel = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const StyledAttributeValue = styled.span`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const StyledPhotoGallery = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const StyledPhoto = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.border.radius.md};
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }
`;

const StyledPhotoPlaceholder = styled.div`
  width: 100%;
  height: 200px;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.font.color.light};
  font-size: ${({ theme }) => theme.font.size.md};
`;

const StyledDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(2)} 0;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};

  &:last-child {
    border-bottom: none;
  }
`;

const StyledActions = styled.div`
  padding: ${({ theme }) => theme.spacing(4)};
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

interface PropertyMapSidebarProps {
  property: Property;
  onClose: () => void;
}

export const PropertyMapSidebar = ({
  property,
  onClose,
}: PropertyMapSidebarProps) => {
  const formatPrice = (price?: number | null) => {
    if (!price) return 'Price on Application';
    return `$${price.toLocaleString()}`;
  };

  const formatArea = (area?: number | null) => {
    if (!area) return '-';
    return `${area.toLocaleString()}m²`;
  };

  const handleViewDetails = () => {
    // TODO: Navigate to property detail page
    console.log('View details for property:', property.id);
  };

  const handleAddToBrief = () => {
    // TODO: Open modal to add property to a brief
    console.log('Add to brief:', property.id);
  };

  return (
    <StyledSidebar>
      <StyledHeader>
        <StyledTitle>Property Details</StyledTitle>
        <LightIconButton
          Icon={IconX}
          onClick={onClose}
          ariaLabel="Close sidebar"
        />
      </StyledHeader>

      <StyledContent>
        <StyledSection>
          <StyledStatus status={property.listingStatus}>
            {property.listingStatus.replace('_', ' ')}
          </StyledStatus>

          <StyledAddress>{property.addressDisplay}</StyledAddress>

          <StyledPrice>{formatPrice(property.askingPrice)}</StyledPrice>

          {property.attributes && (
            <StyledAttributes>
              {property.attributes.bedrooms !== undefined && (
                <StyledAttribute>
                  <IconBed size={20} />
                  <div>
                    <StyledAttributeValue>
                      {property.attributes.bedrooms}
                    </StyledAttributeValue>{' '}
                    <StyledAttributeLabel>Beds</StyledAttributeLabel>
                  </div>
                </StyledAttribute>
              )}
              {property.attributes.bathrooms !== undefined && (
                <StyledAttribute>
                  <IconBath size={20} />
                  <div>
                    <StyledAttributeValue>
                      {property.attributes.bathrooms}
                    </StyledAttributeValue>{' '}
                    <StyledAttributeLabel>Baths</StyledAttributeLabel>
                  </div>
                </StyledAttribute>
              )}
              {property.attributes.carSpaces !== undefined && (
                <StyledAttribute>
                  <IconCar size={20} />
                  <div>
                    <StyledAttributeValue>
                      {property.attributes.carSpaces}
                    </StyledAttributeValue>{' '}
                    <StyledAttributeLabel>Cars</StyledAttributeLabel>
                  </div>
                </StyledAttribute>
              )}
              {property.landSize && (
                <StyledAttribute>
                  <IconRuler size={20} />
                  <div>
                    <StyledAttributeValue>
                      {formatArea(property.landSize)}
                    </StyledAttributeValue>{' '}
                    <StyledAttributeLabel>Land</StyledAttributeLabel>
                  </div>
                </StyledAttribute>
              )}
            </StyledAttributes>
          )}
        </StyledSection>

        {property.photos && property.photos.length > 0 && (
          <StyledSection>
            <StyledSectionTitle>Photos</StyledSectionTitle>
            <StyledPhotoGallery>
              {property.photos.map((photo, index) => (
                <StyledPhoto
                  key={index}
                  src={photo}
                  alt={`${property.addressDisplay} - Photo ${index + 1}`}
                />
              ))}
            </StyledPhotoGallery>
          </StyledSection>
        )}

        {(!property.photos || property.photos.length === 0) && (
          <StyledSection>
            <StyledSectionTitle>Photos</StyledSectionTitle>
            <StyledPhotoPlaceholder>No Photos Available</StyledPhotoPlaceholder>
          </StyledSection>
        )}

        <StyledSection>
          <StyledSectionTitle>Property Information</StyledSectionTitle>

          {property.attributes?.propertyType && (
            <StyledDetailRow>
              <StyledAttributeLabel>Property Type</StyledAttributeLabel>
              <StyledAttributeValue>
                {property.attributes.propertyType.charAt(0).toUpperCase() +
                  property.attributes.propertyType.slice(1)}
              </StyledAttributeValue>
            </StyledDetailRow>
          )}

          {property.buildingSize && (
            <StyledDetailRow>
              <StyledAttributeLabel>Building Size</StyledAttributeLabel>
              <StyledAttributeValue>
                {formatArea(property.buildingSize)}
              </StyledAttributeValue>
            </StyledDetailRow>
          )}

          {property.landSize && (
            <StyledDetailRow>
              <StyledAttributeLabel>Land Size</StyledAttributeLabel>
              <StyledAttributeValue>
                {formatArea(property.landSize)}
              </StyledAttributeValue>
            </StyledDetailRow>
          )}

          {property.addressSuburb && (
            <StyledDetailRow>
              <StyledAttributeLabel>Suburb</StyledAttributeLabel>
              <StyledAttributeValue>{property.addressSuburb}</StyledAttributeValue>
            </StyledDetailRow>
          )}

          {property.addressState && (
            <StyledDetailRow>
              <StyledAttributeLabel>State</StyledAttributeLabel>
              <StyledAttributeValue>{property.addressState}</StyledAttributeValue>
            </StyledDetailRow>
          )}

          {property.addressPostcode && (
            <StyledDetailRow>
              <StyledAttributeLabel>Postcode</StyledAttributeLabel>
              <StyledAttributeValue>{property.addressPostcode}</StyledAttributeValue>
            </StyledDetailRow>
          )}
        </StyledSection>

        {(property.listingAgentName ||
          property.listingAgentPhone) && (
          <StyledSection>
            <StyledSectionTitle>Listing Agent</StyledSectionTitle>

            {property.listingAgentName && (
              <StyledDetailRow>
                <StyledAttributeLabel>Name</StyledAttributeLabel>
                <StyledAttributeValue>
                  {property.listingAgentName}
                </StyledAttributeValue>
              </StyledDetailRow>
            )}

            {property.listingAgentPhone && (
              <StyledDetailRow>
                <StyledAttributeLabel>Phone</StyledAttributeLabel>
                <StyledAttributeValue>
                  {property.listingAgentPhone}
                </StyledAttributeValue>
              </StyledDetailRow>
            )}
          </StyledSection>
        )}
      </StyledContent>

      <StyledActions>
        <Button
          Icon={IconEye}
          title="View Details"
          variant="primary"
          accent="blue"
          size="medium"
          fullWidth
          onClick={handleViewDetails}
        />
        <Button
          Icon={IconPlus}
          title="Add to Brief"
          variant="secondary"
          accent="default"
          size="medium"
          fullWidth
          onClick={handleAddToBrief}
        />
      </StyledActions>
    </StyledSidebar>
  );
};
