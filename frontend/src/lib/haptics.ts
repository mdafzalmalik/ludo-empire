export const hapticFeedback = {
  impactLight: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  impactMedium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },
  impactHeavy: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(35);
    }
  },
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 50, 25]);
    }
  },
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 40, 30, 40, 40]);
    }
  }
};
