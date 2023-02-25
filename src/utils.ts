import MsgReader, { FieldsData } from '@kenjiuno/msgreader';
import MsgHandlerPlugin from 'main';
import { normalizePath, MarkdownRenderer, Component, TFile } from 'obsidian';
import { CustomMessageContent, CustomRecipient } from 'types';
import { stripIndents } from 'common-tags';

export const getMsgContent = async (params: {
	plugin: MsgHandlerPlugin;
	msgPath: string;
}): Promise<CustomMessageContent> => {
	let msgFileBuffer = await params.plugin.app.vault.adapter.readBinary(normalizePath(params.msgPath));
	let msgReader = new MsgReader(msgFileBuffer);
	let fileData = msgReader.getFileData();
	return {
		senderName: dataOrEmpty(fileData.senderName),
		senderEmail: dataOrEmpty(fileData.senderSmtpAddress),
		recipients: getCustomRecipients(fileData.recipients ? fileData.recipients : []),
		creationTime: dataOrEmpty(fileData.creationTime),
		subject: dataOrEmpty(fileData.normalizedSubject),
		body: dataOrEmpty(fileData.body),
	};
};

const getCustomRecipients = (recipients: FieldsData[]): CustomRecipient[] => {
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

const dataOrEmpty = (data: any) => {
	return data ? data : '';
};

export const renderMarkdown = async (mdContent: string, destEl: HTMLElement) => {
	await MarkdownRenderer.renderMarkdown(mdContent, destEl, '', null as unknown as Component);
};

const createMailToLink = (email: string) => {
	return stripIndents` 
    <a aria-label="mailTo:${email} href="mailTo:${email} target="_blank" class="external-link" rel="noopener">
        ${email}
    </a>
`;
};

export const convertMessageContentToMarkdown = (msgContent: CustomMessageContent) => {
	let recipientsText = '';

	for (let recipient of msgContent.recipients) {
		recipientsText += ' ' + recipient.name + createMailToLink(recipient.email) + ';';
	}

	return stripIndents(`
        <div class="oz-msg-handler-header">
            <strong>From</strong>: ${msgContent.senderName} ${createMailToLink(msgContent.senderEmail)} <br/>
            <strong>Sent</strong>: ${msgContent.creationTime} <br/>
            <strong>Recipients</strong>: ${recipientsText}  <br/>
            <strong>Subject</strong>: ${msgContent.subject}  <br/>
        </div> 
        <div class="oz-msg-handler-body">
            ${msgContent.body}
        </div>
    `);
};

export const replaceNewLinesAndCarriages = (txt: string) => {
	return txt?.replace(/[\r\n]+/g, '');
};

export const getHighlightedPartOfSearchResult = (txt: string) => {
	const firstStrongIndex = txt.indexOf('<mark class="oz-highlight">');
	const lastStrongIndex = txt.lastIndexOf('</mark>');

	// Get the start and end indices for the highlighted text
	const startWordIndex = txt.lastIndexOf(' ', firstStrongIndex - 2) + 1;
	const endWordIndex = txt.indexOf(' ', lastStrongIndex + 9);

	// Add 5 words before and after the highlighted text
	const startIndex = Math.max(startWordIndex - 5, 0);
	const endIndex = Math.min(endWordIndex + 5, txt.length);

	return txt.substring(startIndex, endIndex);
};

export const getFileName = (filePath: string) => {
	var index = filePath.lastIndexOf('/');
	if (index !== -1) return filePath.substring(index + 1);
	return filePath;
};

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

export const openFileInNewTab = (params: { plugin: MsgHandlerPlugin; file: TFile }) => {
	openFile({ file: params.file, plugin: params.plugin, newLeaf: true });
};

export const openFileInNewTabGroup = (params: { plugin: MsgHandlerPlugin; file: TFile }) => {
	openFile({ file: params.file, plugin: params.plugin, newLeaf: false, leafBySplit: true });
};
