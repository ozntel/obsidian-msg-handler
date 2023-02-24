import { Plugin, WorkspaceLeaf, normalizePath } from "obsidian";
import { VIEW_TYPE, MsgHandlerView } from "src/view";
import { getMsgContent } from "src/utils";

// https://www.npmjs.com/package/@kenjiuno/msgreader
// https://dexie.org

export default class MsgHandlerPlugin extends Plugin {
	async onload() {
		// Register Plugin View
		this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			return new MsgHandlerView(leaf, this);
		});

		try {
			this.registerExtensions(["msg"], VIEW_TYPE);
		} catch (err) {
			console.log("Msg file extension renderer was already registered");
		}

		this.addCommand({
			id: "see-content-of-messages",
			name: "See Content of Messages in Console",
			callback: async () => {
				let msgFiles = this.app.vault
					.getFiles()
					.filter((f) => f.extension == "msg");

				for (let msgFile of msgFiles) {
					let content = await getMsgContent({
						plugin: this,
						msgPath: msgFile.path,
					});
					console.log(msgFile);
					console.log(content);
				}
			},
		});
	}

	onunload() {}
}
