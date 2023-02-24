import MsgReader, { FieldsData } from '@kenjiuno/msgreader';
import MsgHandlerPlugin from 'main';
import { normalizePath, MarkdownRenderer, Component, TFile } from 'obsidian';
import { CustomMessageContent, CustomRecipient } from 'types';
import { stripIndents } from 'common-tags';
import { getDBMessageContentsByPath, createDBMessageContent, deleteDBMessageContentById } from 'database';

export const getMsgContent = async (params: { plugin: MsgHandlerPlugin; msgPath: string }): Promise<CustomMessageContent> => {
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

/* ------------- EVENT HANDLERS FOR VAULT FILE CHANGES ------------ */

/**
 * This function is created to handle "create" event for vault
 * @param file
 */
export const handleFileCreate = async (file: TFile) => {
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
export const handleFileDelete = async (file: TFile) => {
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
export const handleFileRename = async (file: TFile, oldPath: string) => {
	let dbMsgContents = await getDBMessageContentsByPath({ filePath: oldPath });
	if (dbMsgContents.length > 0) {
		// @TODO Update the content with new path
		console.log(`DB Record is updated for ${file.path}`);
	}
};
