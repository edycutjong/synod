import React from 'react';
import '@testing-library/jest-dom';
import RootLayout, { metadata } from '@/app/layout';

describe('RootLayout', () => {
  it('renders children correctly and sets class names on body element', () => {
    const result = RootLayout({
      children: <div data-testid="child-element">Hello Synod</div>,
    });

    // Verify root is html tag
    expect(result.type).toBe('html');
    expect(result.props.lang).toBe('en');

    // Verify body element exists
    const body = result.props.children[1];
    expect(body.type).toBe('body');
    expect(body.props.className).toContain('antialiased');
    expect(body.props.className).toContain('min-h-screen');
    expect(body.props.className).toContain('bg-[#090d16]');

    // Verify children are passed inside body
    const child = body.props.children;
    expect(child.props['data-testid']).toBe('child-element');
  });

  it('exports correct metadata configuration', () => {
    expect(metadata.title).toBe('Synod War-Room Console — Atomic Multi-Agent TEE Orchestration');
    expect(metadata.description).toContain('Atomic multi-agent transactional orchestration engine');
    expect(metadata.icons).toEqual({
      icon: '/icon.svg',
      apple: '/apple-touch-icon.png',
    });
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      title: 'Synod',
      statusBarStyle: 'black-translucent',
    });
    expect(metadata.other).toEqual({
      'mobile-web-app-capable': 'yes',
    });
    expect(metadata.openGraph?.title).toBe('Synod War-Room Console — Atomic Multi-Agent TEE Orchestration');
    expect(metadata.openGraph?.url).toBe('https://synod.edycu.dev');
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe('summary_large_image');
  });
});
