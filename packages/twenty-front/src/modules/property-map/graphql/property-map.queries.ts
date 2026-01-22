import { gql } from '@apollo/client';

export const FIND_PROPERTIES_IN_BOUNDS = gql`
  query FindPropertiesInBounds($bounds: PropertyBoundsInput!) {
    properties(bounds: $bounds) {
      edges {
        node {
          id
          addressDisplay
          addressStreet
          addressSuburb
          addressState
          addressPostcode
          addressCountry
          latitude
          longitude
          listingStatus
          askingPrice
          soldPrice
          landSize
          floorArea
          photos
          description
          attributes {
            bedrooms
            bathrooms
            carSpaces
            propertyType
            features
          }
          sourceUrl
          sourceId
          listedDate
          soldDate
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_PROPERTY_DETAILS = gql`
  query GetPropertyDetails($id: ID!) {
    property(id: $id) {
      id
      addressDisplay
      addressStreet
      addressSuburb
      addressState
      addressPostcode
      addressCountry
      latitude
      longitude
      listingStatus
      askingPrice
      soldPrice
      landSize
      floorArea
      photos
      description
      attributes {
        bedrooms
        bathrooms
        carSpaces
        propertyType
        features
      }
      sourceUrl
      sourceId
      listedDate
      soldDate
      createdAt
      updatedAt
    }
  }
`;
