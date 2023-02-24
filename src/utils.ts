import MsgReader, { FieldsData } from "@kenjiuno/msgreader";
import MsgHandlerPlugin from "src/main";
import { normalizePath, MarkdownRenderer, Component } from "obsidian";
import { CustomMessageContent, CustomRecipient } from "src/types";
import { stripIndents } from "common-tags";

export const getMsgContent = async (params: {
	plugin: MsgHandlerPlugin;
	msgPath: string;
}): Promise<CustomMessageContent> => {
	let msgFileBuffer = await params.plugin.app.vault.adapter.readBinary(
		normalizePath(params.msgPath)
	);
	let msgReader = new MsgReader(msgFileBuffer);
	let fileData = msgReader.getFileData();
	return {
		senderName: dataOrEmpty(fileData.senderName),
		senderEmail: dataOrEmpty(fileData.senderSmtpAddress),
		recipients: getCustomRecipients(
			fileData.recipients ? fileData.recipients : []
		),
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
	return data ? data : "";
};

export const renderMarkdown = async (
	mdContent: string,
	destEl: HTMLElement
) => {
	await MarkdownRenderer.renderMarkdown(
		mdContent,
		destEl,
		"",
		null as unknown as Component
	);
};

export const convertMessageContentToMarkdown = (
	msgContent: CustomMessageContent
) => {
	let recipientsText = "";
	for (let recipient of msgContent.recipients) {
		recipientsText += recipient.name + "<" + recipient.email + ">; ";
	}

	return stripIndents(`
        <strong>Sender</strong>: ${msgContent.senderName}<${msgContent.senderEmail}>
        <strong>Recipients</strong>: ${recipientsText}
        <strong>Subject</strong>: ${msgContent.subject}
        ${msgContent.body}
    `);
};
