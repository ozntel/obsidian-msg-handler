export interface MSGBaseData {
	senderName: string;
	senderEmail: string;
	recipients: MSGRecipient[];
	creationTime: string;
	subject: string;
	body: string;
}

export interface MSGRenderData extends MSGBaseData {
	attachments: MSGAttachment[];
}

export interface MSGRecipient {
	name: string;
	email: string;
}

export interface MSGAttachment {
	fileName: string;
	fileExtension: string;
	fileArray: Uint8Array;
}

export interface MSGDataIndexed extends MSGBaseData {
	id?: number;
	filePath: string;
	mtime: number;
}
