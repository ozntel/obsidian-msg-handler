export interface CustomMessageContent {
	senderName: string;
	senderEmail: string;
	recipients: CustomRecipient[];
	subject: string;
	body: string;
}

export interface CustomRecipient {
	name: string;
	email: string;
}
