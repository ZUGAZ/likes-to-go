import { render } from 'solid-js/web';

import '@/assets/main.css';

import { startPopup } from '@/entrypoints/popup/start-popup';
import { PopupRoot } from '@/popup/root';

const root = document.getElementById('root');

if (root) {
	startPopup((runtime) => render(() => <PopupRoot runtime={runtime} />, root));
}
