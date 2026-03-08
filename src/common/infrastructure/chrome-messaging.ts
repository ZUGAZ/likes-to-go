export type { RequestMessage } from '@/common/model/request-message';
export type {
	CollectionStatus,
	GetStateResponse,
	MessageResponse,
} from '@/common/model/get-state-response';
export { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
export { registerRuntimeListener } from '@/common/infrastructure/register-runtime-listener';
export { sendToBackground } from '@/common/infrastructure/send-to-background';
export {
	decodeGetStateResponse,
	getState,
} from '@/common/infrastructure/get-state';
export { sendToTab } from '@/common/infrastructure/send-to-tab';
