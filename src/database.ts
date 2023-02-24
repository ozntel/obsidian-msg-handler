import Dexie from 'dexie';
import { TFile } from 'obsidian';
import MsgHandlerPlugin from 'main';
import { DBCustomMessage, CustomMessageContent } from 'types';
import { getMsgContent } from 'utils';

export class MsgHandlerDatabase extends Dexie {
	dbMessageContents!: Dexie.Table<DBCustomMessage, number>;

	constructor() {
		super('MsgHandlerDatabase');
		this.version(1).stores({
			dbMessageContents: '++id, senderName, senderEmail, recipients, subject, body, &filePath, mtime',
		});
	}
}

const pluginDb = new MsgHandlerDatabase();

/**
 * Get all saved messge contents from Database
 * @returns Promise<DBCustomMessage[]>
 */
export const getAllDBMessageContents = async (): Promise<DBCustomMessage[]> => {
	return await pluginDb.dbMessageContents.toArray();
};

/**
 * Get only message content with provided filePath from the database
 * @param { filePath: string }
 * @returns Promise<DBCustomMessage[]>
 */
export const getDBMessageContentsByPath = async (params: { filePath: string }): Promise<DBCustomMessage[]> => {
	const { filePath } = params;
	return await pluginDb.dbMessageContents.where('filePath').equals(filePath).toArray();
};

/**
 * This function will save provided msgContent with the meta data coming from file into the database
 * @param { msgContent: CustomMessageContent, file: TFile }
 */
export const createDBMessageContent = async (params: { msgContent: CustomMessageContent; file: TFile }) => {
	const { msgContent, file } = params;
	await pluginDb.dbMessageContents.add({
		senderName: msgContent.senderName,
		senderEmail: msgContent.senderEmail,
		recipients: msgContent.recipients,
		creationTime: msgContent.creationTime,
		body: msgContent.body,
		subject: msgContent.subject,
		filePath: file.path,
		mtime: file.stat.mtime,
	});
};

/**
 * Delete Message Content By Id from the Database with the provided id
 * @param { id: number | undefined }
 */
export const deleteDBMessageContentById = async (params: { id: number | undefined }) => {
	if (params.id) {
		await pluginDb.dbMessageContents.delete(params.id);
	}
};

/**
 * This function is designed to cross check vault msg files with db message contents and sync them
 * @param { plugin: MsgHandlerPlugin }
 */
export const syncDatabaseWithVaultFiles = async (params: { plugin: MsgHandlerPlugin }) => {
	const { plugin } = params;

	let msgFiles = plugin.app.vault.getFiles().filter((f) => f.extension === 'msg');
	let dbMsgContents = await getAllDBMessageContents();

	// Loop db message contents to see if they exist in the vault
	for (let dbMsgContent of dbMsgContents) {
		if (!msgFiles.some((f) => f.path == dbMsgContent.filePath)) {
			await deleteDBMessageContentById({ id: dbMsgContent.id });
		}
	}
	// Create the msgFiles in DB, which do not exist
	for (let msgFile of msgFiles) {
		if (!dbMsgContents.some((c) => c.filePath === msgFile.path)) {
			let msgContent = await getMsgContent({ plugin: plugin, msgPath: msgFile.path });
			await createDBMessageContent({
				msgContent: msgContent,
				file: msgFile,
			});
		}
	}
};
