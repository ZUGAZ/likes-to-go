import { POPUP_PORT_NAME } from '@/common/model/popup-port-name';

export function registerPopupPortConnectListener(
	onConnect: () => void,
	onDisconnect: () => void,
): void {
	chrome.runtime.onConnect.addListener((port) => {
		if (port.name !== POPUP_PORT_NAME) {
			return;
		}

		onConnect();
		port.onDisconnect.addListener(onDisconnect);
	});
}
