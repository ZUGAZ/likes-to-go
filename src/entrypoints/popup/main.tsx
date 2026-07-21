import { render } from 'solid-js/web';

import '@/assets/main.css';

import { startPopup } from '@/entrypoints/popup/start-popup';
import { PopupRoot } from '@/popup/root';
import { popupTimingSnapshot } from '@/popup/popup-boot-timing';

console.info(
	'[likes-to-go] action popup module evaluated',
	popupTimingSnapshot('module-evaluated'),
);

const root = document.getElementById('root');

if (root) {
	startPopup((runtime) => {
		render(() => <PopupRoot runtime={runtime} />, root);
		console.info(
			'[likes-to-go] action popup UI mounted',
			popupTimingSnapshot('ui-mounted'),
		);
	});
}
