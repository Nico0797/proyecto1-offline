
import { TourStep } from './tourRegistry';

type Placement = TourStep['placement'];

interface PositionResult {
  top: number;
  left: number;
  arrow: string; // Used for arrow positioning if implemented in UI
}

interface Viewport {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

export const useTourPositioning = (
  targetRect: DOMRect | null,
  popoverRect: DOMRect | null,
  placement: Placement,
  viewport: Viewport
): PositionResult => {
  const margin = 12; // Gap between target and popover
  const padding = 16; // Minimum distance from viewport edge
  const width = popoverRect?.width || 380; // Match default width in component
  const height = popoverRect?.height || 200;

  // Default center if no target
  if (!targetRect) {
    return {
      top: (viewport.height - height) / 2,
      left: (viewport.width - width) / 2,
      arrow: 'none'
    };
  }

  // Candidates
  const getCoords = (pos: 'top' | 'right' | 'bottom' | 'left') => {
    switch (pos) {
      case 'top':
        return {
          top: targetRect.top - height - margin,
          left: targetRect.left + (targetRect.width / 2) - (width / 2)
        };
      case 'bottom':
        return {
          top: targetRect.bottom + margin,
          left: targetRect.left + (targetRect.width / 2) - (width / 2)
        };
      case 'left':
        return {
          top: targetRect.top + (targetRect.height / 2) - (height / 2),
          left: targetRect.left - width - margin
        };
      case 'right':
        return {
          top: targetRect.top + (targetRect.height / 2) - (height / 2),
          left: targetRect.right + margin
        };
    }
  };

  const checkFit = (coords: { top: number, left: number }) => {
    return (
      coords.top >= padding &&
      coords.left >= padding &&
      coords.top + height <= viewport.height - padding &&
      coords.left + width <= viewport.width - padding
    );
  };

  // 1. Try preferred placement
  if (placement && placement !== 'auto') {
    const coords = getCoords(placement);
    if (checkFit(coords)) {
      return { ...coords, arrow: placement };
    }
  }

  // 2. Try auto order
  const order: ('bottom' | 'top' | 'right' | 'left')[] = ['bottom', 'top', 'right', 'left'];
  
  for (const pos of order) {
    if (pos === placement) continue; // Already checked
    const coords = getCoords(pos);
    if (checkFit(coords)) {
      return { ...coords, arrow: pos };
    }
  }

  // 3. Fallback: Clamp to viewport
  // Use preferred or bottom
  const fallbackPos = (placement && placement !== 'auto') ? placement : 'bottom';
  const coords = getCoords(fallbackPos);

  // Clamp left/top to keep in viewport
  // We use viewport dimensions which are relative to the viewport top-left
  // If targetRect is relative to viewport, then coords are too.
  
  // Note: TourOverlayDesktop uses absolute positioning.
  // If parent is fixed inset-0, absolute positioning is relative to viewport.
  // So we just need to clamp within viewport width/height.
  
  const clampedLeft = Math.max(padding, Math.min(coords.left, viewport.width - width - padding));
  const clampedTop = Math.max(padding, Math.min(coords.top, viewport.height - height - padding));

  return { top: clampedTop, left: clampedLeft, arrow: fallbackPos };
};
