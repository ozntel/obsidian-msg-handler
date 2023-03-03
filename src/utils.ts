import MsgReader, { FieldsData } from '@kenjiuno/msgreader';
import MsgHandlerPlugin from 'main';
import { MarkdownRenderer, Component, TFile } from 'obsidian';
import { MSGRenderData, MSGRecipient, MSGAttachment } from 'types';
import { readEml, ReadedEmlJson } from 'eml-parse-js';
import dayjs from 'dayjs';

/**
 * This function is to get the MSGRenderData for provided Outlook MSG file under the path provided
 * @param params
 * @returns
 */
export const getMsgContent = async (params: {
	plugin: MsgHandlerPlugin;
	msgFile: TFile;
}): Promise<MSGRenderData> => {
	const { plugin, msgFile } = params;
	if (msgFile.extension === 'msg') {
		let msgFileBuffer = await plugin.app.vault.readBinary(params.msgFile);
		let msgReader = new MsgReader(msgFileBuffer);
		let fileData = msgReader.getFileData();
		return {
			senderName: dataOrEmpty(fileData.senderName),
			senderEmail: dataOrEmpty(fileData.senderSmtpAddress),
			recipients: getCustomRecipients(fileData.recipients ? fileData.recipients : []),
			creationTime: dataOrEmpty(fileData.creationTime),
			subject: dataOrEmpty(fileData.normalizedSubject),
			body: dataOrEmpty(fileData.body),
			attachments: extractMSGAttachments({
				msgReader: msgReader,
				fileDataAttachments: fileData.attachments,
			}),
		};
	} else if (msgFile.extension === 'eml') {
		let readedEmlJson = await readEmlFile({ emlFile: msgFile, plugin: plugin });
		let sender = parseEmlSender({ senderText: readedEmlJson.headers.From });
		console.log(readedEmlJson);
		return {
			senderName: sender.senderName,
			senderEmail: sender.senderEmail,
			recipients: parseEMLRecipients({ readEmlJson: readedEmlJson }),
			creationTime: dayjs(readedEmlJson.date).format('ddd, D MMM YYYY HH:mm:ss'),
			subject: dataOrEmpty(readedEmlJson.subject),
			body: dataOrEmpty(readedEmlJson.text.replace(/\r\n\r\n/g, '\r\n\r\n \r\n\r\n')),
			attachments: extractEMLAttachments({ emlFileReadJson: readedEmlJson }),
		};
	}
};

/**
 * Reads EML TFile And Returns ReadedEmlJson Format
 * @param params
 * @returns
 */
const readEmlFile = async (params: { emlFile: TFile; plugin: MsgHandlerPlugin }): Promise<ReadedEmlJson> => {
	const { emlFile, plugin } = params;
	let emlFileRead = await plugin.app.vault.read(emlFile);
	return new Promise((resolve, reject) => {
		readEml(emlFileRead, (err, ReadedEMLJson) => {
			if (err) {
				reject(err);
			} else {
				resolve(ReadedEMLJson);
			}
		});
	});
};

/**
 * Get the "TO" Sender Text and Render Sender Name and Sender Email from it
 * @param params
 * @returns
 */
const parseEmlSender = (params: { senderText: string }): { senderName: string; senderEmail: string } => {
	let { senderText } = params;
	if (senderText === '' || senderText === undefined || senderText === null) {
		return { senderName: '', senderEmail: '' };
	}
	senderText = senderText.replace(/"/g, '');
	const regex = /^([^<]+) <([^>]+)>$/;
	const match = regex.exec(senderText);
	if (!match) return { senderName: '', senderEmail: '' };
	const [, senderName, senderEmail] = match;
	return { senderName, senderEmail };
};

/**
 * From EML To and CC create MSGRecipient List
 * @param params
 * @returns
 */
const parseEMLRecipients = (params: { readEmlJson: ReadedEmlJson }): MSGRecipient[] => {
	const { readEmlJson } = params;
	let emlTo = dataOrEmpty(readEmlJson.headers.To);
	let emlCC = dataOrEmpty(readEmlJson.headers.CC);
	let recipientsText = emlTo + (emlCC === '' ? '' : ', ' + emlCC);
	let recipientsTextSplit = recipientsText.split('>,');
	const regex = /"([^"]+)"\s*<?([^>\s]+)>?/;
	let msgRecipients = [];
	for (let recipientText of recipientsTextSplit) {
		const match = recipientText.match(regex);
		if (match) {
			const name = match[1] || match[3];
			const email = match[2] || match[4];
			msgRecipients.push({ name, email });
		}
	}
	return msgRecipients;
};

/**
 * This function is to extract attachments coming from MsgReader Library and convert into MSGAttachment that
 * is later consumed by MSGRenderData
 * @param params
 * @returns
 */
const extractMSGAttachments = (params: {
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
 * Extract Attachments from EML File Read
 * @param params
 * @returns
 */
const extractEMLAttachments = (params: { emlFileReadJson: ReadedEmlJson }): MSGAttachment[] => {
	const { emlFileReadJson } = params;

	if (emlFileReadJson.attachments && emlFileReadJson.attachments.length > 0) {
		let attachments: MSGAttachment[] = [];
		for (let attachment of params.emlFileReadJson.attachments) {
			let fileNameParts = attachment.name.split('.');
			let extension = fileNameParts[fileNameParts.length - 1];
			attachments.push({
				fileName: attachment.name,
				fileExtension: '.' + extension,
				fileArray: attachment.data as Uint8Array,
			});
		}
		return attachments;
	} else {
		return [];
	}
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
	if (!newLeaf && leafBySplit) leaf = plugin.app.workspace.createLeafBySplit(leaf, 'vertical');
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

/**
 * Check if event is a mouse event
 * @param e
 * @returns
 */
export function isMouseEvent(e: React.TouchEvent | React.MouseEvent): e is React.MouseEvent {
	return e && 'screenX' in e;
}
