// frontend-next/src/lib/events.js
export const OPEN_WATCH_REQUEST_POPUP = 'open-watch-request-popup';

// ✅ NEW: open notifications panel from MenuDrawer
export const OPEN_NOTIFICATIONS_PANEL = 'mf-open-notifications-panel';

// ✅ fired on window when SW posts PUSH_RECEIVED
export const PUSH_RECEIVED_EVENT = 'mf-push-received';

// ✅ favorites changed (MovieCard + NavBar sync)
export const FAVORITES_UPDATED_EVENT = 'mf-favorites-updated';

// ✅ NEW: fired when a new Service Worker is waiting (new deployment)
export const SW_UPDATE_AVAILABLE_EVENT = 'mf-sw-update-available';

// ✅ NEW: global flag — we reload ONLY when user clicks "Update Now"
export const SW_RELOAD_ON_CONTROLLERCHANGE_FLAG =
  '__mf_sw_reload_on_controllerchange';

// ✅ NEW: fired when the public website feedback modal opens/closes.
// All inline EffectiveGate ad iframes listen to this and unmount while open.
export const FEEDBACK_MODAL_OPEN_EVENT = 'mf-feedback-modal-open-change';
