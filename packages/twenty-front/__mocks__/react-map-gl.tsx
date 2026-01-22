import React from 'react';

export default function Map({ children }: { children?: React.ReactNode }) {
  return <div data-testid="mock-map">{children}</div>;
}

export function Source({ children }: { children?: React.ReactNode }) {
  return <div data-testid="mock-source">{children}</div>;
}

export function Layer() {
  return <div data-testid="mock-layer" />;
}

export function Marker({ children }: { children?: React.ReactNode }) {
  return <div data-testid="mock-marker">{children}</div>;
}

export function Popup({ children }: { children?: React.ReactNode }) {
  return <div data-testid="mock-popup">{children}</div>;
}

export function NavigationControl() {
  return <div data-testid="mock-navigation-control" />;
}
