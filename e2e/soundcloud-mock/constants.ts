/** Origin and cookie URL must match production soundcloud-login-cookie. */
export const SOUNDCLOUD_ORIGIN = 'https://soundcloud.com';
export const SOUNDCLOUD_LIKES_PATH = '/you/likes';
export const SOUNDCLOUD_LIKES_URL = `${SOUNDCLOUD_ORIGIN}${SOUNDCLOUD_LIKES_PATH}`;

/** Must match the production session cookie name in soundcloud-login-cookie. */
export const SOUNDCLOUD_SESSION_COOKIE_NAME = 'oauth_token';

/** Must match the production login DOM contract in shared layout selectors. */
export const USER_NAV_CLASS = 'header__userNav';
export const USER_NAV_SELECTOR = `.${USER_NAV_CLASS}`;

/** Must match the production loading-indicator selector in shared layout selectors. */
export const LOADING_INDICATOR_SELECTOR = '.loading.regular.m-padded';

export const OVERLAY_HOST_SELECTOR = 'likes-to-go-beat';
export const OVERLAY_ROOT_SELECTOR = 'main.beat-root';

export const BADGES_VIEW_FIXTURE_FILE = 'badges-view.html';
