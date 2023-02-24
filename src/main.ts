import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE, MsgHandlerView } from 'src/view';
import { syncDatabaseWithVaultFiles, createDBMessageContent, getDBMessageContentsByPath, deleteDBMessageContentById } from 'src/database';
import { getMsgContent } from 'src/utils';

export default class MsgHandlerPlugin extends Plugin {
	async onload() {
		// --> Register Plugin View
		this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			return new MsgHandlerView(leaf, this);
		});

		// --> Register Extension for 'msg' file reading
		try {
			this.registerExtensions(['msg'], VIEW_TYPE);
		} catch (err) {
			console.log('Msg file extension renderer was already registered');
		}

		// --> During initial load sync vault msg files with DB
		this.app.workspace.onLayoutReady(() => {
			syncDatabaseWithVaultFiles({ plugin: this }).then(() => {
				console.log('DB Sync is completed for MSG Files');
			});
		});

		// --> Add Event listeners for vault file changes (create, delete, rename)
		this.app.vault.on('create', async (file) => {
			if (file.path.endsWith('msg')) {
				let dbMsgContents = await getDBMessageContentsByPath({ filePath: file.path });
				if (dbMsgContents.length === 0) {
					let msgContent = await getMsgContent({ plugin: this, msgPath: file.path });
					createDBMessageContent({
						msgContent: msgContent,
						file: file as TFile,
					});
					console.log(`DB Record is created for ${file.path}`);
				}
			}
		});
		this.app.vault.on('delete', async (file) => {
			if (file.path.endsWith('msg')) {
				let dbMsgContents = await getDBMessageContentsByPath({ filePath: file.path });
				if (dbMsgContents.length > 0) {
					for (let dbMsgContent of dbMsgContents) {
						await deleteDBMessageContentById({ id: dbMsgContent.id });
						console.log(`DB Record is deleted for ${file.path}`);
					}
				}
			}
		});
		this.app.vault.on('rename', async (file, oldPath) => {
			let dbMsgContents = await getDBMessageContentsByPath({ filePath: oldPath });
			if (dbMsgContents.length > 0) {
				// @TODO Update the content with new path
				console.log(`DB Record is updated for ${file.path}`);
			}
		});
	}

	onunload() {}
}
