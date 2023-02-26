import MsgHandlerPlugin from 'main';
import { TFile } from 'obsidian';
import React, { useEffect, useState } from 'react';
import { MSGAttachment, MSGRecipient, MSGRenderData } from 'types';
import { getMsgContent } from 'utils';
import { MdKeyboardArrowDown, MdKeyboardArrowRight, MdClose } from 'react-icons/md';
import { FolderToSaveSuggestionModal } from 'modals';

/* ------------ Main Renderer Component ------------ */

export default function RendererViewComponent(params: { plugin: MsgHandlerPlugin; fileToRender: TFile }) {
	const { plugin, fileToRender } = params;
	const [messageContent, setMessageContent] = useState<MSGRenderData>();

	useEffect(() => {
		getMsgContent({ plugin: plugin, msgPath: fileToRender.path }).then((msgContent) => {
			setMessageContent(msgContent);
		});
	}, []);

	return (
		messageContent && (
			<>
				<MSGHeaderComponent messageContent={messageContent} />
				<MSGBodyComponent messageContent={messageContent} />
				<MSGAttachmentsComponent messageAttachments={messageContent.attachments} plugin={plugin} />
			</>
		)
	);
}

/* ------------ Child Components ------------ */

const MSGHeaderComponent = (params: { messageContent: MSGRenderData }) => {
	const { messageContent } = params;
	const [open, setOpen] = useState<boolean>(true);
	const toggleOpen = () => setOpen(!open);
	return (
		<>
			<h3 onClick={toggleOpen} className="oz-cursor-pointer oz-msg-header-name">
				<ToggleIndicator open={open} />
				Message Header
			</h3>
			{open && (
				<div className="oz-msg-handler-header">
					<strong>From</strong>: {messageContent.senderName}
					{' <'}
					<a
						aria-label={'mailTo:' + messageContent.senderEmail}
						href={'mailTo:' + messageContent.senderEmail}
						target="_blank"
						className="external-link"
						rel="noopener">
						{messageContent.senderEmail}
					</a>
					{'>'}
					<br></br>
					<strong>Recipients</strong>: <RecipientList recipients={messageContent.recipients} /> <br></br>
					<strong>Sent</strong>: {messageContent.creationTime} <br></br>
					<strong>Subject</strong>: {messageContent.subject}
				</div>
			)}
		</>
	);
};

const MSGBodyComponent = (params: { messageContent: MSGRenderData }) => {
	const { messageContent } = params;
	const cleanMsgBody = (txt: string) => txt.replace(/[\r\n]+/g, '</br>');
	const [open, setOpen] = useState<boolean>(true);
	const toggleOpen = () => setOpen(!open);
	return (
		<>
			<h3 onClick={toggleOpen} className="oz-cursor-pointer oz-msg-attachments-body-name">
				<ToggleIndicator open={open} />
				Message Body
			</h3>
			{open && (
				<div
					className="oz-msg-handler-body"
					dangerouslySetInnerHTML={{ __html: cleanMsgBody(messageContent.body) }}></div>
			)}
		</>
	);
};

const MSGAttachmentsComponent = (params: { messageAttachments: MSGAttachment[]; plugin: MsgHandlerPlugin }) => {
	const { messageAttachments, plugin } = params;
	const [open, setOpen] = useState<boolean>(true);
	const toggleOpen = () => setOpen(!open);
	return (
		<>
			<h3 onClick={toggleOpen} className="oz-cursor-pointer oz-msg-attachments-header-name">
				<ToggleIndicator open={open} />
				Attachments
			</h3>
			{open && (
				<div className="oz-msg-handler-attachments">
					{messageAttachments.map((attachment) => {
						return (
							<MSGSingleAttachmentComponent
								key={attachment.fileName}
								messageAttachment={attachment}
								plugin={plugin}
							/>
						);
					})}
				</div>
			)}
		</>
	);
};

const MSGSingleAttachmentComponent = (params: { messageAttachment: MSGAttachment; plugin: MsgHandlerPlugin }) => {
	const { messageAttachment, plugin } = params;
	const [open, setOpen] = useState<boolean>(false);
	const toggleOpen = () => setOpen(!open);

	// @TODO Find Way to Clean Blob From Memory When the Tab is Closed
	const blobToURL = (fileArray: Uint8Array) => {
		const blob = new Blob([fileArray]);
		const url = URL.createObjectURL(blob);
		return url;
	};

	const saveFileToVault = () => {
		let modal = new FolderToSaveSuggestionModal(
			plugin.app,
			messageAttachment.fileArray,
			messageAttachment.fileName
		);
		modal.open();
	};

	const imgExtensions: string[] = ['.png', 'png', '.jpg'];

	return (
		<div className="oz-msg-single-attachment-wrapper">
			<div onClick={toggleOpen} className="oz-cursor-pointer oz-msg-attachment-name">
				{imgExtensions.includes(messageAttachment.fileExtension) ? (
					<ToggleIndicator open={open} />
				) : (
					<MdClose className="react-icon" />
				)}
				{messageAttachment.fileName}
				<button onClick={saveFileToVault}>Save File to Vault</button>
			</div>
			{open && (
				<div className="oz-msg-attachment-display">
					{imgExtensions.includes(messageAttachment.fileExtension) && (
						<img src={blobToURL(messageAttachment.fileArray)} />
					)}
				</div>
			)}
		</div>
	);
};

/* ------------ Helper Components ------------ */

const RecipientList = (params: { recipients: MSGRecipient[] }) => {
	const { recipients } = params;
	return (
		<>
			{recipients.map((recipient) => {
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
						{'>'}
						{recipients.length > 1 ? '; ' : ''}
					</span>
				);
			})}
		</>
	);
};

const ToggleIndicator = (params: { open: boolean }) => {
	const { open } = params;
	return open ? <MdKeyboardArrowDown className="react-icon" /> : <MdKeyboardArrowRight className="react-icon" />;
};
