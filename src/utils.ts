import MsgReader, { FieldsData } from '@kenjiuno/msgreader';
import MsgHandlerPlugin from 'main';
import { normalizePath, MarkdownRenderer, Component, TFile } from 'obsidian';
import { MSGRenderData, MSGRecipient, MSGAttachment } from 'types';

/**
 * This function is to get the MSGRenderData for provided Outlook MSG file under the path provided
 * @param params
 * @returns
 */
export const getMsgContent = async (params: {
	plugin: MsgHandlerPlugin;
	msgPath: string;
}): Promise<MSGRenderData> => {
	let msgFileBuffer = await params.plugin.app.vault.adapter.readBinary(normalizePath(params.msgPath));
	let msgReader = new MsgReader(msgFileBuffer);
	let fileData = msgReader.getFileData();
	console.log(fileData);
	return {
		senderName: dataOrEmpty(fileData.senderName),
		senderEmail: dataOrEmpty(fileData.senderSmtpAddress),
		recipients: getCustomRecipients(fileData.recipients ? fileData.recipients : []),
		creationTime: dataOrEmpty(fileData.creationTime),
		subject: dataOrEmpty(fileData.normalizedSubject),
		body: dataOrEmpty(fileData.body),
		attachments: extractAttachments({ msgReader: msgReader, fileDataAttachments: fileData.attachments }),
	};
};

/**
 * This function is to extract attachments coming from MsgReader Library and convert into MSGAttachment that
 * is later consumed by MSGRenderData
 * @param params
 * @returns
 */
const extractAttachments = (params: {
	msgReader: MsgReader;
	fileDataAttachments: FieldsData[];
}): MSGAttachment[] => {
	const { msgReader, fileDataAttachments } = params;
	let msgAttachments: MSGAttachment[] = [];
	for (let [index, fileDataAttachment] of fileDataAttachments.entries()) {
		let attRead = msgReader.getAttachment(index);
		msgAttachments.push({
			fileName: attRead.fileName,
			fileExtension: fileDataAttachment.extension,
			fileArray: attRead.content,
		});
	}
	return msgAttachments;
};

/**
 * This function is to convert Recipients from MsgReader Library format to MSGRecipient format
 * @param recipients
 * @returns
 */
const getCustomRecipients = (recipients: FieldsData[]): MSGRecipient[] => {
	if (recipients && recipients.length > 0) {
		let customRecipients = [];
		for (let recipient of recipients) {
			customRecipients.push({
				name: dataOrEmpty(recipient.name),
				email: dataOrEmpty(recipient.smtpAddress),
			});
		}
		return customRecipients;
	} else {
		return [];
	}
};

/**
 * Checks object if it is null and returns empty string if null
 * @param data
 * @returns
 */
const dataOrEmpty = (data: any) => {
	return data ? data : '';
};

/**
 * Obsidians native markdown renderer function
 * @param mdContent
 * @param destEl
 */
export const renderMarkdown = async (mdContent: string, destEl: HTMLElement) => {
	await MarkdownRenderer.renderMarkdown(mdContent, destEl, '', null as unknown as Component);
};

/**
 * Helps to cleanup the new line signs within Rich Text Editor format, which is \r\n
 * @param txt
 * @returns
 */
export const replaceNewLinesAndCarriages = (txt: string) => {
	return txt?.replace(/[\r\n]+/g, '');
};

/**
 * This function extracts the file name (including extension) from a full file path
 * @param filePath
 * @returns
 */
export const getFileName = (filePath: string) => {
	var index = filePath.lastIndexOf('/');
	if (index !== -1) return filePath.substring(index + 1);
	return filePath;
};

/**
 * Helper to open a file passed in params within Obsidian (Tab/Separate)
 * @param params
 */
export const openFile = (params: {
	file: TFile;
	plugin: MsgHandlerPlugin;
	newLeaf: boolean;
	leafBySplit?: boolean;
}) => {
	const { file, plugin, newLeaf, leafBySplit } = params;
	let leaf = plugin.app.workspace.getLeaf(newLeaf);
	if (leafBySplit) leaf = plugin.app.workspace.createLeafBySplit(leaf, 'vertical');
	plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
	leaf.openFile(file, { eState: { focus: true } });
};

/**
 * This function will open the file provided as a new tab
 * @param params
 */
export const openFileInNewTab = (params: { plugin: MsgHandlerPlugin; file: TFile }) => {
	openFile({ file: params.file, plugin: params.plugin, newLeaf: true });
};

/**
 * This function will open the file as a separate column and will create a new split leaf
 * @param params
 */
export const openFileInNewTabGroup = (params: { plugin: MsgHandlerPlugin; file: TFile }) => {
	openFile({ file: params.file, plugin: params.plugin, newLeaf: false, leafBySplit: true });
};
