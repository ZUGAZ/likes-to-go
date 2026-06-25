import { ACTION_DEFAULT_POPUP_PATH } from '@/background/action-popup-path';
import { isSoundCloudUrl } from '@/common/model/url/is-soundcloud-url';

export function actionPopupPathForUrl(rawUrl: string | undefined): string {
	return isSoundCloudUrl(rawUrl) ? '' : ACTION_DEFAULT_POPUP_PATH;
}
