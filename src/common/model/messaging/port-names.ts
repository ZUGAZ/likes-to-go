/** Runtime port name for calls into the background (`BackgroundRpcs`). Popup, extension pages, and content connect to it. */
export const BACKGROUND_RPC_PORT_NAME = 'likes-to-go/background';

/** Tab port name for calls from the background into a content script (`ContentRpcs`). */
export const CONTENT_RPC_PORT_NAME = 'likes-to-go/content';
