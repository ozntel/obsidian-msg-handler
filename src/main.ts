import { Plugin, TFile, WorkspaceLeaf, addIcon } from 'obsidian';
import {
	RENDER_VIEW_TYPE,
	MsgHandlerView,
	MsgHandlerSearchView,
	SEARCH_VIEW_TYPE,
	ICON,
	renderMsgFileToElement,
} from 'view';
import { getMsgContent } from 'utils';
import { MSG_HANDLER_ENVELOPE_ICON } from 'icons';
import { MSGHandlerPluginSettings, MSGHandlerPluginSettingsTab, DEFAULT_SETTINGS } from 'settings';
import {
	createDBMessageContent,
	deleteDBMessageContentById,
	getDBMessageContentsByPath,
	syncDatabaseWithVaultFiles,
	updateFilePathOfAllRecords,
} from 'database';

export default class MsgHandlerPlugin extends Plugin {
	acceptedExtensions: string[] = ['msg', 'eml'];
	settings: MSGHandlerPluginSettings;
	ribbonIconEl: HTMLElement | undefined = undefined;

	async onload() {
		// --> Add Icons
		addIcon(ICON, MSG_HANDLER_ENVELOPE_ICON);

		// --> Load Settings
		this.addSettingTab(new MSGHandlerPluginSettingsTab(this.app, this));
		await this.loadSettings();

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
				if (this.settings.logEnabled) console.log('Vault DB Sync is completed for MSG Files');
			});
			this.openMsgHandlerSearchLeaf({ showAfterAttach: false });
		});

		// --> Preview Render
		this.registerMarkdownPostProcessor((el, ctx) => {
			let msgElement =
				el.querySelector('.internal-embed[src$=".eml"]') ||
				el.querySelector('.internal-embed[src$=".msg"]');
			if (msgElement) {
				let src = msgElement.getAttribute('src');
				if (src) {
					let msgFile = this.app.metadataCache.getFirstLinkpathDest(src, ctx.sourcePath);
					if (msgFile) {
						// Remove the default msg render from preview
						let parentMsgElement = msgElement.parentElement;
						msgElement.remove();
						// Create new div to render msg
						let wrapperDiv = parentMsgElement.createEl('div');
						wrapperDiv.addClass('oz-msg-handler-preview-render');
						// Render to the new div
						this.renderMSG({
							msgFile: msgFile as TFile,
							targetEl: wrapperDiv,
						});
					}
				}
			}
		});

		// --> Add Commands
		this.addCommand({
			id: 'reveal-msg-handler-search-leaf',
			name: 'Reveal Search Leaf',
			callback: () => {
				this.openMsgHandlerSearchLeaf({ showAfterAttach: true });
			},
		});

		// --> Add Event listeners for vault file changes (create, delete, rename)
		this.app.vault.on('create', this.handleFileCreate);
		this.app.vault.on('delete', this.handleFileDelete);
		this.app.vault.on('rename', this.handleFileRename);

		// Ribbon Icon For Opening
		this.ribbonIconEl = this.addRibbonIcon(ICON, 'MSG Handler', async () => {
			await this.openMsgHandlerSearchLeaf({ showAfterAttach: true });
		});
	}

	onunload() {
		// --> Delete event listeners onunload
		this.app.vault.off('create', this.handleFileCreate);
		this.app.vault.off('delete', this.handleFileDelete);
		this.app.vault.off('rename', this.handleFileRename);
	}

	// @API - SHARED WITH OZAN'S IMAGE IN EDITOR - DO NOT CHANGE OR SYNC BEFORE
	renderMSG = async (params: { msgFile: TFile; targetEl: HTMLElement }) => {
		const { msgFile, targetEl } = params;
		await renderMsgFileToElement({
			msgFile: msgFile,
			targetEl: targetEl,
			plugin: this,
		});
	};

	// @API - SHARED WITH OZAN'S IMAGE IN EDITOR - DO NOT CHANGE OR SYNC BEFORE
	cleanLoadedBlobs = (params: { all: boolean; forMsgFile?: TFile }) => {
		/* Deprecated - Blobs are not created anymore */
	};

	openMsgHandlerSearchLeaf = async (params: { showAfterAttach: boolean }) => {
		const { showAfterAttach } = params;
		let leafs = this.app.workspace.getLeavesOfType(SEARCH_VIEW_TYPE);
		if (leafs.length === 0) {
			let leaf = this.app.workspace.getLeftLeaf(false);
			await leaf.setViewState({ type: SEARCH_VIEW_TYPE });
			if (showAfterAttach) this.app.workspace.revealLeaf(leaf);
		} else {
			if (showAfterAttach && leafs.length > 0) {
				this.app.workspace.revealLeaf(leafs[0]);
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
			this.registerExtensions(this.acceptedExtensions, RENDER_VIEW_TYPE);
		} catch (err) {
			if (this.settings.logEnabled) console.log('Msg file extension renderer was already registered');
		}
	};

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/* --------------- EVENT HANDLERS FOR VAULT FILE CHANGES -------------- */

	/**
	 * This function is created to handle "create" event for vault
	 * @param file
	 */
	handleFileCreate = async (file: TFile) => {
		if (this.acceptedExtensions.contains(file.extension)) {
			let dbMsgContents = await getDBMessageContentsByPath({ filePath: file.path });
			if (dbMsgContents.length === 0) {
				let msgContent = await getMsgContent({ plugin: this, msgFile: file });
				createDBMessageContent({
					msgContent: msgContent,
					file: file as TFile,
				});
				if (this.settings.logEnabled) console.log(`DB Index Record is created for ${file.path}`);
			}
		}
	};

	/**
	 * This function is created to handle "delete" event for vault
	 * @param file
	 */
	handleFileDelete = async (file: TFile) => {
		if (this.acceptedExtensions.contains(file.extension)) {
			let dbMsgContents = await getDBMessageContentsByPath({ filePath: file.path });
			if (dbMsgContents.length > 0) {
				for (let dbMsgContent of dbMsgContents) {
					await deleteDBMessageContentById({ id: dbMsgContent.id });
					if (this.settings.logEnabled) console.log(`DB Index Record is deleted for ${file.path}`);
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
		await updateFilePathOfAllRecords({ oldValue: oldPath, newValue: file.path });
		if (this.settings.logEnabled) console.log(`DB Index Record is updated for ${file.path}`);
	};
}
