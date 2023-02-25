import MsgHandlerPlugin from 'main';
import { TFile } from 'obsidian';
import React, { useEffect, useState } from 'react';
import { MSGBaseData, MSGRecipient } from 'types';
import { getMsgContent } from 'utils';

/* ------------ Main Renderer Component ------------ */

export default function RendererViewComponent(params: { plugin: MsgHandlerPlugin; fileToRender: TFile }) {
	const { plugin, fileToRender } = params;

	const [messageContent, setMessageContent] = useState<MSGBaseData>();

	useEffect(() => {
		getMsgContent({ plugin: plugin, msgPath: fileToRender.path }).then((msgContent) => {
			setMessageContent(msgContent);
		});
	}, []);

	const cleanMsgBody = (txt: string) => {
		return txt.replace(/[\r\n]+/g, '</br>');
	};

	return (
		messageContent && (
			<>
				<div className="oz-msg-handler-header">
					<strong>From</strong>: {messageContent.senderName} <br></br>
					<strong>Recipients</strong>: <RecipientList recipients={messageContent.recipients} /> <br></br>
					<strong>Sent</strong>: {messageContent.creationTime} <br></br>
					<strong>Subject</strong>: {messageContent.subject}
				</div>
				<div
					className="oz-msg-handler-body"
					dangerouslySetInnerHTML={{ __html: cleanMsgBody(messageContent.body) }}></div>
			</>
		)
	);
}

/* ------------ Child Components ------------ */

const RecipientList = (params: { recipients: MSGRecipient[] }) => {
	return (
		<>
			{params.recipients.map((recipient) => {
				return (
					<span id={recipient.email}>
						{recipient.name}
						{' <'}
						<a
							aria-label={'mailTo:' + recipient.email}
							href={'mailTo:' + recipient.email}
							target="_blank"
							className="external-link"
							rel="noopener">
							{recipient.email}
						</a>
						{'>; '}
					</span>
				);
			})}
		</>
	);
};
