import { FileView, TFile, WorkspaceLeaf } from 'obsidian';
import MsgHandlerPlugin from 'src/main';
import { renderMarkdown, convertMessageContentToMarkdown, getMsgContent } from 'src/utils';

export const VIEW_TYPE = 'msg-handler-view';
export const VIEW_DISPLAY_TEXT = 'MSG Handler';
export const ICON = 'sheets-in-box';

export class MsgHandlerView extends FileView {
	plugin: MsgHandlerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: MsgHandlerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	async onLoadFile(file: TFile): Promise<void> {
		const msgContent = await getMsgContent({
			plugin: this.plugin,
			msgPath: file.path,
		});

		await renderMarkdown(convertMessageContentToMarkdown(msgContent), this.contentEl);
	}

	async onUnloadFile(file: TFile): Promise<void> {
		this.contentEl.innerHTML = '';
		super.onUnloadFile(file);
	}
}
