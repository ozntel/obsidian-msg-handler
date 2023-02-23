import { Plugin, normalizePath } from "obsidian";
import MsgReader from "@kenjiuno/msgreader";

// https://www.npmjs.com/package/@kenjiuno/msgreader
// https://dexie.org

export default class MsgReaderPlugin extends Plugin {
	async onload() {
		let msgFiles = this.app.vault
			.getFiles()
			.filter((f) => f.extension == "msg");

		for (let msgFile of msgFiles) {
			let msgFileBuffer = await this.app.vault.adapter.readBinary(
				normalizePath(msgFile.path)
			);
			let msgReader = new MsgReader(msgFileBuffer);
			console.log(msgReader.getFileData());
		}
	}

	onunload() {}
}
