import { defineBackground } from "wxt/utils/define-background";

import { initBackgroundService } from "@/background/background-service";

export default defineBackground(() => {
	console.log("[likes-to-go] background loaded with hot reload!!", new Date().toISOString());
	initBackgroundService();
});
