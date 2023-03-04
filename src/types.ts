export interface MSGBaseData {
	senderName: string;
	senderEmail: string;
	recipients: MSGRecipient[];
	creationTime: string;
	subject: string;
	body: string;
}

// --> This type is created to use for direct render for renderer/index
export interface MSGRenderData extends MSGBaseData {
	attachments: MSGAttachment[];
}

// --> Message Recipient Details
export interface MSGRecipient {
	name: string;
	email: string;
}

// --> Message Attachment details
export interface MSGAttachment {
	fileName: string;
	fileExtension: string;
	fileArray: Uint8Array | string;
}

// --> This type is created to store indexed data within the database
export interface MSGDataIndexed extends MSGBaseData {
	id?: number;
	filePath: string;
	mtime: number;
}

// --> This type is only used for the purpose of fussysort search results
// To ensure that all object fields are searched only after converted into
// eligible string
export interface MSGDataIndexedSearchEligible extends Omit<MSGDataIndexed, 'recipients'> {
	recipients: string;
}

export interface LoadedBlob {
	originFilePath: string;
	url: string;
}

/* --- External Library Helper Interface --- */

export interface Ext_MSGReader_FileData {
	senderName: string;
	senderEmail: string;
	recipients: Ext_MSGReader_Recipient[];
	subject: string;
	body: string;
	attachments: Ext_MSGReader_Attachment[];
	// Not used
	headers: string;
	bodyHTML: string;
}

export interface Ext_MSGReader_Recipient {
	name: string;
	email: string;
}

export interface Ext_MSGReader_Attachment {
	contentLenght: number;
	dataId: number;
	extension: string;
	fileName: string;
	fileNameShort: string;
	mimeType: string;
	name: string;
	pidContentId: string;
}

export interface Ext_MSGReader_AttachmentData {
	fileName: string;
	content: Uint8Array;
}
