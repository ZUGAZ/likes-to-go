import { POPUP_PORT_NAME } from '@/common/model/popup-port-name';

export function connectPopupPort(): void {
	const connect = (): void => {
		const port = chrome.runtime.connect({ name: POPUP_PORT_NAME });
		port.onDisconnect.addListener(() => {
			if (document.visibilityState === 'hidden') {
				return;
			}
			connect();
		});
	};

	connect();
}
