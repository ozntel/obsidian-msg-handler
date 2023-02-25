import { Plugin, TFile, WorkspaceLeaf, addIcon } from 'obsidian';
import { RENDER_VIEW_TYPE, MsgHandlerView, MsgHandlerSearchView, SEARCH_VIEW_TYPE } from 'view';
import { getMsgContent } from 'utils';
import { MSG_HANDLER_ENVELOPE_ICON } from 'icons';
import {
	createDBMessageContent,
	deleteDBMessageContentById,
	getDBMessageContentsByPath,
	syncDatabaseWithVaultFiles,
} from 'database';

export default class MsgHandlerPlugin extends Plugin {
	async onload() {
		// --> Add Icons
		addIcon('MSG_HANDLER_ENVELOPE_ICON', MSG_HANDLER_ENVELOPE_ICON);

		// --> Register Plugin Render View
		this.registerView(RENDER_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			return new MsgHandlerView(leaf, this);
		});

		// --> Register Plugin Search View
		this.registerView(SEARCH_VIEW_TYPE, (leaf) => {
			return new MsgHandlerSearchView(leaf, this);
		});

		// --> Register Extension for 'msg' file rendering
		this.registerMsgExtensionView();

		// --> During initial load sync vault msg files with DB and open Search
		this.app.workspace.onLayoutReady(() => {
			syncDatabaseWithVaultFiles({ plugin: this }).then(() => {
				console.log('DB Sync is completed for MSG Files');
			});
			this.openMsgHandlerSearchLeaf({ showAfterAttach: false });
		});

		// --> Add Event listeners for vault file changes (create, delete, rename)
		this.app.vault.on('create', this.handleFileCreate);
		this.app.vault.on('delete', this.handleFileDelete);
		this.app.vault.on('rename', this.handleFileRename);
	}

	onunload() {
		// --> Delete event listeners onunload
		this.app.vault.off('create', this.handleFileCreate);
		this.app.vault.off('delete', this.handleFileDelete);
		this.app.vault.off('rename', this.handleFileRename);
	}

	openMsgHandlerSearchLeaf = async (params: { showAfterAttach: boolean }) => {
		const { showAfterAttach } = params;
		let leafs = this.app.workspace.getLeavesOfType(SEARCH_VIEW_TYPE);
		if (leafs.length === 0) {
			let leaf = this.app.workspace.getLeftLeaf(false);
			await leaf.setViewState({ type: SEARCH_VIEW_TYPE });
			if (showAfterAttach) this.app.workspace.revealLeaf(leaf);
		} else {
			if (showAfterAttach) {
				leafs.forEach((leaf) => this.app.workspace.revealLeaf(leaf));
			}
		}
	};

	detachMsgHandlerSearchLeaf = () => {
		let leafs = this.app.workspace.getLeavesOfType(SEARCH_VIEW_TYPE);
		for (let leaf of leafs) {
			(leaf.view as MsgHandlerSearchView).destroy();
			leaf.detach();
		}
	};

	registerMsgExtensionView = () => {
		try {
			this.registerExtensions(['msg'], RENDER_VIEW_TYPE);
		} catch (err) {
			console.log('Msg file extension renderer was already registered');
		}
	};

	/* --------------- EVENT HANDLERS FOR VAULT FILE CHANGES -------------- */

	/**
	 * This function is created to handle "create" event for vault
	 * @param file
	 */
	handleFileCreate = async (file: TFile) => {
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
	};

	/**
	 * This function is created to handle "delete" event for vault
	 * @param file
	 */
	handleFileDelete = async (file: TFile) => {
		if (file.path.endsWith('msg')) {
			let dbMsgContents = await getDBMessageContentsByPath({ filePath: file.path });
			if (dbMsgContents.length > 0) {
				for (let dbMsgContent of dbMsgContents) {
					await deleteDBMessageContentById({ id: dbMsgContent.id });
					console.log(`DB Record is deleted for ${file.path}`);
				}
			}
		}
	};

	/**
	 * This function is created to handle "rename" event for vault
	 * @param file
	 * @param oldPath
	 */
	handleFileRename = async (file: TFile, oldPath: string) => {
		let dbMsgContents = await getDBMessageContentsByPath({ filePath: oldPath });
		if (dbMsgContents.length > 0) {
			// @TODO Update the content with new path
			console.log(`DB Record is updated for ${file.path}`);
		}
	};
}
