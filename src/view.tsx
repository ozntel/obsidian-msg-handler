import { FileView, TFile, WorkspaceLeaf, ItemView } from 'obsidian';
import MsgHandlerPlugin from 'main';
import React from 'react';
import ReactDOM from 'react-dom';
import SearchViewComponent from 'components/search';
import RendererViewComponent from 'components/renderer';

/* ------------ CORE MSG HANDLER RENDERER WITH REACT ------------ */

export const renderMsgFileToElement = async (params: {
	msgFile: TFile;
	targetEl: HTMLElement;
	plugin: MsgHandlerPlugin;
}) => {
	const { msgFile, targetEl, plugin } = params;
	return new Promise<void>((resolve, reject) => {
		ReactDOM.render(
			<div className="msg-handler-plugin-renderer">
				<RendererViewComponent plugin={plugin} fileToRender={msgFile} />
			</div>,
			targetEl,
			() => resolve()
		);
	});
};

/* ------------ RENDERER VIEW FOR FILE PREVIEW ------------ */

export const RENDER_VIEW_TYPE = 'msg-handler-view';

export class MsgHandlerView extends FileView {
	plugin: MsgHandlerPlugin;
	fileToRender: TFile;

	constructor(leaf: WorkspaceLeaf, plugin: MsgHandlerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return RENDER_VIEW_TYPE;
	}

	destroy() {
		ReactDOM.unmountComponentAtNode(this.contentEl);
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.constructMessageRenderView({ fileToRender: file });
		this.fileToRender = file;
	}

	async constructMessageRenderView(params: { fileToRender: TFile }) {
		this.destroy();
		await renderMsgFileToElement({
			msgFile: params.fileToRender,
			targetEl: this.contentEl,
			plugin: this.plugin,
		});
	}

	async onClose(): Promise<void> {
		this.plugin.cleanLoadedBlobs({ all: false, forMsgFile: this.fileToRender });
	}

	async onUnloadFile(file: TFile): Promise<void> {
		this.contentEl.innerHTML = '';
		super.onUnloadFile(file);
	}
}

/* ------------ SEARCH VIEW FOR MSG CONTENTS ------------ */

export const SEARCH_VIEW_DISPLAY_TEXT = 'MSG Handler Search';
export const SEARCH_VIEW_TYPE = 'msg-handler-search-view';
export const ICON = 'MSG_HANDLER_ENVELOPE_ICON';

export class MsgHandlerSearchView extends ItemView {
	plugin: MsgHandlerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: MsgHandlerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return SEARCH_VIEW_TYPE;
	}

	getDisplayText(): string {
		return SEARCH_VIEW_DISPLAY_TEXT;
	}

	getIcon(): string {
		return ICON;
	}

	destroy() {
		ReactDOM.unmountComponentAtNode(this.contentEl);
	}

	async onClose() {
		this.destroy();
	}

	async onOpen(): Promise<void> {
		this.destroy();
		this.constructMsgSearchView();
	}

	constructMsgSearchView() {
		this.destroy();
		ReactDOM.render(
			<div className="msg-handler-plugin-search">
				<SearchViewComponent plugin={this.plugin} />
			</div>,
			this.contentEl
		);
	}
}
