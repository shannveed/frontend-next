// frontend-next/src/lib/events.js
export const OPEN_WATCH_REQUEST_POPUP = 'open-watch-request-popup';

// ✅ Open notifications panel from MenuDrawer / footer
export const OPEN_NOTIFICATIONS_PANEL = 'mf-open-notifications-panel';

// ✅ Fired on window when SW posts PUSH_RECEIVED
export const PUSH_RECEIVED_EVENT = 'mf-push-received';

// ✅ Favorites changed (MovieCard + NavBar sync)
export const FAVORITES_UPDATED_EVENT = 'mf-favorites-updated';

// ✅ Fired when a new Service Worker is waiting (new deployment)
export const SW_UPDATE_AVAILABLE_EVENT = 'mf-sw-update-available';

// ✅ Global flag — reload ONLY when user clicks "Update Now"
export const SW_RELOAD_ON_CONTROLLERCHANGE_FLAG =
  '__mf_sw_reload_on_controllerchange';

// ✅ Public feedback modal open/close.
// Ad components listen to this and unmount/pause while the form is open.
export const FEEDBACK_MODAL_OPEN_CHANGE_EVENT =
  'mf-feedback-modal-open-change';
