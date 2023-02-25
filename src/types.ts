export interface MSGBaseData {
	senderName: string;
	senderEmail: string;
	recipients: MSGRecipient[];
	creationTime: string;
	subject: string;
	body: string;
}

export interface MSGRecipient {
	name: string;
	email: string;
}

export interface MSGDataIndexed extends MSGBaseData {
	id?: number;
	filePath: string;
	mtime: number;
}
