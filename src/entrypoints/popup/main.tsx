import { render } from "solid-js/web";

import "@/assets/main.css";

import { Popup } from "@/popup/popup";

const root = document.getElementById("root");
if (root) {
	render(() => <Popup />, root);
}
