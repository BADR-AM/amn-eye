import { useEffect } from 'react';

/**
 * Custom hook for fast POS-style keyboard navigation across the recruits system.
 * 
 * Keys:
 * - ArrowDown / ArrowLeft / J: Select next recruit card (in RTL left moves forward)
 * - ArrowUp / ArrowRight / K: Select previous recruit card
 * - Home: Jump to first recruit card
 * - End: Jump to last recruit card
 * - Enter: View details modal of selected recruit
 * - Space: Toggle checkbox selection of selected recruit
 * - T: Open Security / Suspicion Ticket modal
 * - M: Open Medical / Hospital Referral modal
 * - D: Open Documents / National ID scanner modal
 * - Y / N: Open Psychological / Nervous follow-up modal
 * - P: Open Locker Card print preview
 * - F2: Open new recruit registration / kiosk
 * - F3 or /: Focus search bar
 * - F5: Refresh recruits data
 * - Escape: Close modal / blur search input
 */
export const useKeyboardShortcuts = ({
  itemsCount,
  selectedIndex,
  setSelectedIndex,
  onOpenDetails,
  onOpenActivity,
  onOpenCard,
  onOpenTicket,
  onOpenDocuments,
  onOpenPsychological,
  onToggleSelect,
  onNewRecruit,
  onRefreshData,
  searchInputRef,
  enabled = true,
}) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      const isInput = activeElement && (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) ||
        activeElement.isContentEditable
      );

      // Search focus hotkey (/ or F3)
      if ((e.key === '/' || e.key === 'F3') && !isInput) {
        e.preventDefault();
        searchInputRef?.current?.focus();
        return;
      }

      // Escape always blurs or closes
      if (e.key === 'Escape') {
        if (isInput) {
          activeElement.blur();
        }
        return;
      }

      // F5 data refresh
      if (e.key === 'F5' && !isInput) {
        if (onRefreshData) {
          e.preventDefault();
          onRefreshData();
          return;
        }
      }

      // F2 new recruit kiosk
      if (e.key === 'F2' && !isInput) {
        if (onNewRecruit) {
          e.preventDefault();
          onNewRecruit();
          return;
        }
      }

      // If user is currently typing in an input, do not trigger single-key action shortcuts
      if (isInput) return;

      const scrollToItem = (idx) => {
        setTimeout(() => {
          const el = document.getElementById(`recruit-card-${idx}`);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 10);
      };

      // Navigation: Next (ArrowDown, ArrowLeft in RTL, or 'j')
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (itemsCount === 0) return -1;
          const next = prev + 1 >= itemsCount ? 0 : prev + 1;
          scrollToItem(next);
          return next;
        });
        return;
      }

      // Navigation: Previous (ArrowUp, ArrowRight in RTL, or 'k')
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (itemsCount === 0) return -1;
          const next = prev - 1 < 0 ? itemsCount - 1 : prev - 1;
          scrollToItem(next);
          return next;
        });
        return;
      }

      // Jump to first
      if (e.key === 'Home') {
        e.preventDefault();
        if (itemsCount > 0) {
          setSelectedIndex(0);
          scrollToItem(0);
        }
        return;
      }

      // Jump to last
      if (e.key === 'End') {
        e.preventDefault();
        if (itemsCount > 0) {
          const last = itemsCount - 1;
          setSelectedIndex(last);
          scrollToItem(last);
        }
        return;
      }

      // Actions on currently selected item:
      if (selectedIndex < 0 || selectedIndex >= itemsCount) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        onOpenDetails?.(selectedIndex);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onToggleSelect?.(selectedIndex);
      } else if (e.key === 't' || e.key === 'T' || e.key === 'ف') {
        e.preventDefault();
        onOpenTicket?.(selectedIndex);
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'ة') {
        e.preventDefault();
        onOpenActivity?.(selectedIndex);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ي') {
        e.preventDefault();
        onOpenDocuments?.(selectedIndex);
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'ح') {
        e.preventDefault();
        onOpenCard?.(selectedIndex);
      } else if (e.key === 'y' || e.key === 'Y' || e.key === 'غ') {
        e.preventDefault();
        onOpenPsychological?.(selectedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    itemsCount,
    selectedIndex,
    setSelectedIndex,
    onOpenDetails,
    onOpenActivity,
    onOpenCard,
    onOpenTicket,
    onOpenDocuments,
    onOpenPsychological,
    onToggleSelect,
    onNewRecruit,
    onRefreshData,
    searchInputRef,
    enabled
  ]);
};
