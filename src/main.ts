import { Plugin, WorkspaceLeaf, addIcon } from 'obsidian';
import { RENDER_VIEW_TYPE, MsgHandlerView, MsgHandlerSearchView, SEARCH_VIEW_TYPE } from 'view';
import { syncDatabaseWithVaultFiles } from 'database';
import { handleFileCreate, handleFileDelete, handleFileRename } from 'utils';
import { MSG_HANDLER_ENVELOPE_ICON } from 'icons';

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
		this.app.vault.on('create', handleFileCreate);
		this.app.vault.on('delete', handleFileDelete);
		this.app.vault.on('rename', handleFileRename);
	}

	onunload() {
		// --> Delete event listeners onunload
		this.app.vault.off('create', handleFileCreate);
		this.app.vault.off('delete', handleFileDelete);
		this.app.vault.off('rename', handleFileRename);
	}

	openMsgHandlerSearchLeaf = async (params: { showAfterAttach: boolean }) => {
		const { showAfterAttach } = params;
		let leafs = this.app.workspace.getLeavesOfType(SEARCH_VIEW_TYPE);
		if (leafs.length === 0) {
			let leaf = this.app.workspace.getLeftLeaf(false);
			await leaf.setViewState({ type: SEARCH_VIEW_TYPE });
			if (showAfterAttach) this.app.workspace.revealLeaf(leaf);
		} else {
			leafs.forEach((leaf) => this.app.workspace.revealLeaf(leaf));
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
}
