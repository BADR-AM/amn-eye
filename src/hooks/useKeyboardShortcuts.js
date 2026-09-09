import { useEffect } from 'react';

/**
 * Custom hook for fast keyboard navigation in the recruits dashboard (IBM Carbon inspired).
 * 
 * Keys:
 * - ArrowDown / J: Select next recruit card
 * - ArrowUp / K: Select previous recruit card
 * - Enter: View details of selected recruit
 * - M: Open Medical / Activity tracking modal for selected recruit
 * - P: Open Locker Card print preview for selected recruit
 * - /: Focus search input
 * - Escape: Close open modals / blur inputs
 */
export const useKeyboardShortcuts = ({
  itemsCount,
  selectedIndex,
  setSelectedIndex,
  onOpenDetails,
  onOpenActivity,
  onOpenCard,
  searchInputRef,
  enabled = true,
}) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      const isInput = activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef?.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        if (isInput) {
          activeElement.blur();
        }
        return;
      }

      if (isInput) return;

      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (itemsCount === 0) return -1;
          const next = prev + 1;
          return next >= itemsCount ? 0 : next;
        });
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (itemsCount === 0) return -1;
          const next = prev - 1;
          return next < 0 ? itemsCount - 1 : next;
        });
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < itemsCount) {
          e.preventDefault();
          onOpenDetails?.(selectedIndex);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (selectedIndex >= 0 && selectedIndex < itemsCount) {
          e.preventDefault();
          onOpenActivity?.(selectedIndex);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (selectedIndex >= 0 && selectedIndex < itemsCount) {
          e.preventDefault();
          onOpenCard?.(selectedIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemsCount, selectedIndex, setSelectedIndex, onOpenDetails, onOpenActivity, onOpenCard, searchInputRef, enabled]);
};
