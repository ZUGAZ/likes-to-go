import { defineBackground } from "wxt/utils/define-background";

import { initBackgroundService } from "@/background/background-service";

export default defineBackground(() => {
	initBackgroundService();
});
