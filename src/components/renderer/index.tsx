import MsgHandlerPlugin from 'main';
import { TFile } from 'obsidian';
import React, { useEffect, useState } from 'react';
import { MSGAttachment, MSGRecipient, MSGRenderData } from 'types';
import { getMsgContent } from 'utils';
import { MdKeyboardArrowDown, MdKeyboardArrowRight, MdClose } from 'react-icons/md';
import { HiChevronDoubleRight, HiChevronDoubleLeft } from 'react-icons/hi';
import { FolderToSaveSuggestionModal } from 'modals';

/* ------------ Main Renderer Component ------------ */

export default function RendererViewComponent(params: { plugin: MsgHandlerPlugin; fileToRender: TFile }) {
	const { plugin, fileToRender } = params;
	const [messageContent, setMessageContent] = useState<MSGRenderData>();

	useEffect(() => {
		getMsgContent({ plugin: plugin, msgFile: fileToRender }).then((msgContent) => {
			setMessageContent(msgContent);
			console.log(msgContent);
		});
	}, []);

	return (
		messageContent && (
			<>
				<MSGHeaderComponent messageContent={messageContent} />
				<MSGBodyComponent messageContent={messageContent} />
				{messageContent.attachments.length > 0 && (
					<MSGAttachmentsComponent
						messageAttachments={messageContent.attachments}
						fileToRender={fileToRender}
						plugin={plugin}
					/>
				)}
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

const MSGAttachmentsComponent = (params: {
	fileToRender: TFile;
	messageAttachments: MSGAttachment[];
	plugin: MsgHandlerPlugin;
}) => {
	const { fileToRender, messageAttachments, plugin } = params;
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
								fileToRender={fileToRender}
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

const MSGSingleAttachmentComponent = (params: {
	fileToRender: TFile;
	messageAttachment: MSGAttachment;
	plugin: MsgHandlerPlugin;
}) => {
	const { fileToRender, messageAttachment, plugin } = params;
	const [open, setOpen] = useState<boolean>(false);
	const toggleOpen = () => setOpen(!open);

	const blobToURL = (fileArray: Uint8Array) => {
		const blob = new Blob([fileArray]);
		const url = URL.createObjectURL(blob);
		// Push into loadedBlobs so that can be unloaded during file onClose (in renderer/index.tsx)
		plugin.loadedBlobs.push({
			url: url,
			originFilePath: fileToRender.path,
		});
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

	const imgExtensions: string[] = ['.png', 'png', '.jpg', 'jpg', '.jpeg', 'jpeg'];

	return (
		<div className="oz-msg-single-attachment-wrapper">
			<div onClick={toggleOpen} className="oz-cursor-pointer oz-msg-attachment-name">
				{imgExtensions.includes(messageAttachment.fileExtension) ? (
					<ToggleIndicator open={open} />
				) : (
					<MdClose className="msg-handler-react-icon" />
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
	const [open, setOpen] = useState<boolean>();

	const moreThanOneRecipient = recipients.length > 1;

	useEffect(() => setOpen(!moreThanOneRecipient), []);

	return (
		<>
			{moreThanOneRecipient &&
				(open ? (
					<HiChevronDoubleLeft
						className="msg-handler-react-icon"
						onClick={() => setOpen(false)}
						size="18"
					/>
				) : (
					<HiChevronDoubleRight
						className="msg-handler-react-icon"
						onClick={() => setOpen(true)}
						size="18"
					/>
				))}
			{open &&
				recipients.map((recipient) => {
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
	return open ? (
		<MdKeyboardArrowDown className="msg-handler-react-icon" />
	) : (
		<MdKeyboardArrowRight className="msg-handler-react-icon" />
	);
};
