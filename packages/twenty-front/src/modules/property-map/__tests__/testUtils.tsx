import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from '@emotion/react';

// Mock theme object matching Twenty's theme structure
const mockTheme = {
  background: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    tertiary: '#e0e0e0',
  },
  border: {
    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
  },
  boxShadow: {
    light: '0 2px 4px rgba(0,0,0,0.1)',
    medium: '0 4px 8px rgba(0,0,0,0.15)',
  },
  font: {
    family: 'Inter, sans-serif',
    size: {
      sm: '12px',
      md: '14px',
      lg: '16px',
    },
  },
  spacing: (multiplier: number) => `${multiplier * 8}px`,
  color: {
    blue: '#4285f4',
    gray50: '#f5f5f5',
    gray100: '#e0e0e0',
  },
};

interface AllTheProvidersProps {
  children: ReactNode;
  mocks?: MockedResponse[];
  initialRecoilState?: Record<string, unknown>;
}

export const AllTheProviders = ({
  children,
  mocks = [],
}: AllTheProvidersProps) => {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <RecoilRoot>
        <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
      </RecoilRoot>
    </MockedProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: MockedResponse[];
  initialRecoilState?: Record<string, unknown>;
}

export const renderWithProviders = (
  ui: ReactElement,
  options?: CustomRenderOptions,
) => {
  const { mocks, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders mocks={mocks}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  });
};

export const waitForNextUpdate = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const createMockViewState = (overrides?: Partial<any>) => ({
  latitude: -33.8688,
  longitude: 151.2093,
  zoom: 11,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
  ...overrides,
});

export const createMockBounds = (overrides?: Partial<any>) => ({
  north: -33.85,
  south: -33.89,
  east: 151.23,
  west: 151.19,
  ...overrides,
});
