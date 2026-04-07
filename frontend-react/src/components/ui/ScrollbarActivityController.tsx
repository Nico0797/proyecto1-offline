import { useEffect } from 'react';

const SCROLLBAR_SELECTOR = '.custom-scrollbar, .app-scrollbar';
const SCROLLING_ATTRIBUTE = 'data-scrolling';
const SCROLL_IDLE_DELAY_MS = 720;

export const ScrollbarActivityController = () => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const scrollTimers = new Map<HTMLElement, number>();

    const markScrolling = (region: HTMLElement) => {
      const existingTimer = scrollTimers.get(region);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      region.setAttribute(SCROLLING_ATTRIBUTE, 'true');

      const timer = window.setTimeout(() => {
        region.removeAttribute(SCROLLING_ATTRIBUTE);
        scrollTimers.delete(region);
      }, SCROLL_IDLE_DELAY_MS);

      scrollTimers.set(region, timer);
    };

    const handleScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const scrollRegion = target.matches(SCROLLBAR_SELECTOR)
        ? target
        : target.closest<HTMLElement>(SCROLLBAR_SELECTOR);

      if (!scrollRegion) {
        return;
      }

      markScrolling(scrollRegion);
    };

    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      scrollTimers.forEach((timer, region) => {
        window.clearTimeout(timer);
        region.removeAttribute(SCROLLING_ATTRIBUTE);
      });
      scrollTimers.clear();
    };
  }, []);

  return null;
};
