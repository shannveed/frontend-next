'use client';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { BsCollectionPlay } from 'react-icons/bs';
import { CgMenuBoxed } from 'react-icons/cg';
import { BiHomeAlt, BiCategory } from 'react-icons/bi';
import { FaBell } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

import MenuDrawer from '../drawer/MenuDrawer';
import { SidebarContext } from '../../context/DrawerContext';
import { getUserInfo } from '../../lib/client/auth';

import {
  getNotifications as getNotificationsApi,
  markNotificationRead as markNotificationReadApi,
  deleteNotification as deleteNotificationApi,
  clearNotifications as clearNotificationsApi,
} from '../../lib/client/notifications';

import { replyToWatchRequest } from '../../lib/client/watchRequests';

import {
  isPushSupported,
  ensurePushSubscription,
  requestPermissionAndSubscribe,
} from '../../lib/client/pushNotifications';

import { OPEN_WATCH_REQUEST_POPUP, PUSH_RECEIVED_EVENT } from '../../lib/events';

export default function MobileFooter() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    mobileDrawer,
    toggleDrawer,
    closeDrawer,

    activeMobileTab,
    setActiveMobileTab,
    setActiveMobileHomeTab,
  } = useContext(SidebarContext);

  const [userInfo, setUserInfoState] = useState(null);
  const token = userInfo?.token || null;
  const isAdmin = !!userInfo?.isAdmin;

  // Notifications panel
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Admin reply UI
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyLink, setReplyLink] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const isHomePage = pathname === '/';
  const isMoviesPage = pathname.startsWith('/movies');

  // Keep userInfo in sync (CRA parity)
  useEffect(() => {
    setUserInfoState(getUserInfo());
    const onStorage = () => setUserInfoState(getUserInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const closeNotifications = useCallback(() => {
    setNotifyOpen(false);
    setReplyOpenId(null);
    setReplyLink('');
    setReplyMessage('');
  }, []);

  const closeAllOverlays = useCallback(() => {
    closeNotifications();
    closeDrawer?.();
  }, [closeDrawer, closeNotifications]);

  // prevent scroll while notifications open
  useEffect(() => {
    if (!notifyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [notifyOpen]);

  // Close notifs if user logs out
  useEffect(() => {
    if (!token) closeNotifications();
  }, [token, closeNotifications]);

  const refreshNotifications = useCallback(
    async (silent = true) => {
      if (!token) return;

      try {
        if (!silent) setNotifLoading(true);
        const data = await getNotificationsApi(token, 50);
        setNotifications(data?.notifications || []);
        setUnreadCount(data?.unreadCount || 0);
      } catch (e) {
        if (!silent) toast.error(e?.message || 'Failed to load notifications');
      } finally {
        if (!silent) setNotifLoading(false);
      }
    },
    [token]
  );

  // Poll notifications (like CRA)
  useEffect(() => {
    if (!token) return;

    refreshNotifications(true);
    const id = setInterval(() => refreshNotifications(true), 15000);
    return () => clearInterval(id);
  }, [token, refreshNotifications]);

  // Refresh instantly on push event
  useEffect(() => {
    if (!token) return;

    const handler = () => refreshNotifications(true);
    window.addEventListener(PUSH_RECEIVED_EVENT, handler);
    return () => window.removeEventListener(PUSH_RECEIVED_EVENT, handler);
  }, [token, refreshNotifications]);

  const openWatchRequestPopup = () => {
    closeAllOverlays();
    window.dispatchEvent(new Event(OPEN_WATCH_REQUEST_POPUP));
  };

  const maybePromptPush = useCallback(async () => {
    if (!token) return;

    try {
      if (!isPushSupported()) return;

      if (Notification.permission === 'granted') {
        await ensurePushSubscription(token);
      } else if (Notification.permission === 'default') {
        const key = 'pushPermissionPrompted';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          await requestPermissionAndSubscribe(token);
        }
      }
    } catch (e) {
      console.warn('[push] enable failed:', e);
    }
  }, [token]);

  /* ===========================
     NAV HANDLERS
     =========================== */

  const handleHomeClick = (e) => {
    e.preventDefault();
    closeAllOverlays();

    setActiveMobileHomeTab('latestNew');
    setActiveMobileTab('home');

    if (isHomePage) {
      window.scrollTo(0, 0);
    } else {
      router.push('/');
    }
  };

  const handleBrowseByClick = (e) => {
    e.preventDefault();
    closeAllOverlays();

    setActiveMobileTab('browseBy');

    if (isHomePage) {
      window.scrollTo(0, 0);
    } else {
      router.push('/');
    }
  };

  /**
   * ✅ FIX: Movies click should NOT change Home tab state.
   * Otherwise HomeClient can briefly render BrowseBy before navigation finishes.
   */
  const handleMoviesClick = (e) => {
    e.preventDefault();
    closeAllOverlays();
    router.push('/movies');
  };

  const handleMenuClick = () => {
    closeNotifications();
    toggleDrawer?.();
  };

  const handleNotificationsClick = async (e) => {
    e.preventDefault();

    if (mobileDrawer) closeDrawer?.();

    if (!token) {
      toast.error('Please login to view notifications');
      router.push('/login');
      return;
    }

    await maybePromptPush();

    const next = !notifyOpen;
    setNotifyOpen(next);
    if (next) await refreshNotifications(false);
  };

  /* ===========================
     NOTIFICATION ACTIONS
     =========================== */

  const handleClearNotifications = async () => {
    if (!token) return;
    try {
      await clearNotificationsApi(token);
      await refreshNotifications(true);
      closeNotifications();
    } catch (e) {
      toast.error(e?.message || 'Failed to clear notifications');
    }
  };

  const handleRemoveSingleNotification = async (id) => {
    if (!token) return;
    try {
      await deleteNotificationApi(token, id);
      await refreshNotifications(true);
    } catch (e) {
      toast.error(e?.message || 'Failed to remove notification');
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif) return;

    try {
      if (!notif.read && token) {
        await markNotificationReadApi(token, notif._id);
      }
    } catch {
      // ignore
    }

    const link = notif.link;
    closeNotifications();

    if (link) {
      if (link.startsWith('http')) window.location.href = link;
      else router.push(link);
    }
  };

  const handleAdminReplyRequest = async (notif) => {
    const requestId = notif?.meta?.requestId;
    if (!requestId) return toast.error('Missing requestId');

    const link = replyLink.trim();
    if (!link) return toast.error('Please paste the movie/web-series link');

    try {
      setReplyLoading(true);
      await replyToWatchRequest(token, requestId, {
        link,
        message: replyMessage.trim(),
      });

      toast.success('Reply sent');
      setReplyOpenId(null);
      setReplyLink('');
      setReplyMessage('');
      await refreshNotifications(true);
    } catch (e) {
      toast.error(e?.message || 'Reply failed');
    } finally {
      setReplyLoading(false);
    }
  };

  const sortedNotifications = useMemo(() => {
    return [...(notifications || [])].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [notifications]);

  /* ===========================
     ACTIVE STATES (UI)
     =========================== */

  const active = 'bg-customPurple text-white';
  const inActive =
    'transition duration-300 text-xl flex-colo text-white hover:bg-customPurple hover:text-white rounded-md px-3 py-1.5';

  const isHomeActive = isHomePage && activeMobileTab !== 'browseBy';
  const isBrowseByActive = isHomePage && activeMobileTab === 'browseBy';
  const isMoviesActive = isMoviesPage;
  const isNotifActive = notifyOpen;

  return (
    <>
      {/* Drawer */}
      <MenuDrawer drawerOpen={mobileDrawer} toggleDrawer={toggleDrawer} />

      {/* Notifications Panel */}
      {notifyOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeNotifications} aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/60" />

          <div
            className="absolute left-2 right-2 bottom-20 bg-black border border-customPurple rounded-lg shadow-xl z-[61] p-2 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 gap-2">
              <h4 className="text-sm font-semibold text-white">Notifications</h4>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {!isAdmin && (
                  <button
                    onClick={openWatchRequestPopup}
                    className="text-xs text-customPurple hover:underline"
                    type="button"
                  >
                    Request Movie
                  </button>
                )}

                {sortedNotifications.length > 0 && (
                  <button
                    onClick={handleClearNotifications}
                    className="text-xs text-subMain hover:underline"
                    type="button"
                  >
                    Clear all
                  </button>
                )}

                <button
                  onClick={closeNotifications}
                  className="text-gray-300 hover:text-white"
                  aria-label="Close notifications"
                  type="button"
                >
                  <IoClose size={18} />
                </button>
              </div>
            </div>

            {notifLoading && (
              <p className="text-xs text-border px-2 py-2">Loading...</p>
            )}

            {!notifLoading && sortedNotifications.length === 0 && (
              <div className="px-2 py-2">
                <p className="text-sm text-border mb-2">No notifications</p>

                {!isAdmin && (
                  <button
                    onClick={openWatchRequestPopup}
                    className="w-full border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transitions rounded py-2 text-sm"
                    type="button"
                  >
                    Request a Movie / Web‑Series
                  </button>
                )}
              </div>
            )}

            {!notifLoading &&
              sortedNotifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`text-white px-2 py-2 border border-gray-700 rounded-md mb-2 last:mb-0 ${
                    !notif.read ? 'bg-gray-800/50' : 'bg-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={`text-left flex-1 ${notif.read ? 'opacity-70' : ''}`}
                    >
                      {notif.title ? (
                        <p className="text-xs font-semibold mb-1">{notif.title}</p>
                      ) : null}
                      <p className="text-sm">{notif.message}</p>
                    </button>

                    <button
                      onClick={() => handleRemoveSingleNotification(notif._id)}
                      className="p-1 text-gray-300 hover:text-red-500"
                      title="Remove notification"
                      aria-label="Remove notification"
                      type="button"
                    >
                      <IoClose size={14} />
                    </button>
                  </div>

                  {/* Admin reply UI */}
                  {isAdmin && notif.type === 'watch_request' && (
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          setReplyOpenId((prev) => (prev === notif._id ? null : notif._id));
                          setReplyLink('');
                          setReplyMessage('');
                        }}
                        className="text-xs text-customPurple hover:underline"
                        type="button"
                      >
                        {replyOpenId === notif._id ? 'Close Reply' : 'Reply'}
                      </button>

                      {replyOpenId === notif._id && (
                        <div className="mt-2 space-y-2">
                          <input
                            value={replyLink}
                            onChange={(e) => setReplyLink(e.target.value)}
                            placeholder="Paste movie link (https://...)"
                            className="w-full bg-main border border-border rounded px-2 py-2 text-xs outline-none focus:border-customPurple"
                          />
                          <input
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Optional message to user"
                            className="w-full bg-main border border-border rounded px-2 py-2 text-xs outline-none focus:border-customPurple"
                          />
                          <button
                            onClick={() => handleAdminReplyRequest(notif)}
                            className="w-full bg-customPurple text-white rounded py-2 text-xs disabled:opacity-60"
                            disabled={replyLoading}
                            type="button"
                          >
                            {replyLoading ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <footer className="lg:hidden fixed z-50 bottom-0 w-full px-1">
        <div className="bg-dry rounded-md flex-btn w-full p-1">
          <button
            onClick={handleHomeClick}
            className={isHomeActive ? `${active} ${inActive}` : inActive}
            aria-label="Home"
            type="button"
          >
            <div className="flex flex-col items-center">
              <BiHomeAlt className="text-lg" />
              <span className="text-[9px] mt-0.5">Home</span>
            </div>
          </button>

          <button
            onClick={handleBrowseByClick}
            className={isBrowseByActive ? `${active} ${inActive}` : inActive}
            aria-label="Browse By"
            type="button"
          >
            <div className="flex flex-col items-center">
              <BiCategory className="text-lg" />
              <span className="text-[9px] mt-0.5">BrowseBy</span>
            </div>
          </button>

          <button
            onClick={handleMoviesClick}
            className={isMoviesActive ? `${active} ${inActive}` : inActive}
            aria-label="Movies"
            type="button"
          >
            <div className="flex flex-col items-center">
              <BsCollectionPlay className="text-lg" />
              <span className="text-[9px] mt-0.5">Movies</span>
            </div>
          </button>

          <button
            onClick={handleNotificationsClick}
            className={isNotifActive ? `${active} ${inActive}` : inActive}
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            type="button"
          >
            <div className="relative flex flex-col items-center">
              <FaBell className="text-lg" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 w-5 h-5 flex-colo rounded-full text-[10px] bg-customPurple text-white">
                  {unreadCount}
                </span>
              )}
              <span className="text-[9px] mt-0.5">Alerts</span>
            </div>
          </button>

          <button
            onClick={handleMenuClick}
            className={inActive}
            aria-label="Menu"
            type="button"
          >
            <div className="flex flex-col items-center">
              <CgMenuBoxed className="text-lg" />
              <span className="text-[9px] mt-0.5">Menu</span>
            </div>
          </button>
        </div>
      </footer>
    </>
  );
}

