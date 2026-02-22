import { defineContentScript } from "wxt/utils/define-content-script";
import { initContentScript } from "@/content/content-script";

export default defineContentScript({
	matches: ["*://soundcloud.com/you/likes*"],
	runAt: "document_idle",
	main(ctx) {
		initContentScript(ctx);
	},
});
