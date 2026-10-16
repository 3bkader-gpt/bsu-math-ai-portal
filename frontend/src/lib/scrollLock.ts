/**
 * Bulletproof cross-platform background scroll lock for mobile and desktop modals.
 * Prevents background scroll chaining and iOS Safari rubber-band background movement.
 */

let lockCount = 0;
let previousScrollY = 0;

export function lockBodyScroll() {
  if (typeof window === 'undefined') return;

  lockCount++;
  if (lockCount === 1) {
    previousScrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${previousScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll() {
  if (typeof window === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, previousScrollY);
  }
}
