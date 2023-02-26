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
	fileArray: Uint8Array;
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
