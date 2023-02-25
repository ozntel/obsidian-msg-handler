import Dexie from 'dexie';
import { TFile } from 'obsidian';
import MsgHandlerPlugin from 'main';
import { MSGDataIndexed, MSGBaseData } from 'types';
import { getMsgContent } from 'utils';
import fuzzysort from 'fuzzysort';

// --> Custom Class from Dexie to Handle Indexed DB
export class MsgHandlerDatabase extends Dexie {
	dbMessageContents!: Dexie.Table<MSGDataIndexed, number>;

	constructor() {
		super('MsgHandlerDatabase');
		this.version(1).stores({
			dbMessageContents: '++id, senderName, senderEmail, recipients, subject, body, &filePath, mtime',
		});
	}
}

// --> Create Custom Class DB Instance
const pluginDb = new MsgHandlerDatabase();

/**
 * Get all saved/synced message contents from Database
 * @returns Promise<DBCustomMessage[]>
 */
export const getAllDBMessageContents = async (): Promise<MSGDataIndexed[]> => {
	return await pluginDb.dbMessageContents.toArray();
};

/**
 * Get only message content with provided filePath from the database
 * @param { filePath: string }
 * @returns Promise<DBCustomMessage[]>
 */
export const getDBMessageContentsByPath = async (params: { filePath: string }): Promise<MSGDataIndexed[]> => {
	const { filePath } = params;
	return await pluginDb.dbMessageContents.where('filePath').equals(filePath).toArray();
};

/**
 * This function will save provided msgContent with the meta data coming from file into the database
 * @param { msgContent: CustomMessageContent, file: TFile }
 */
export const createDBMessageContent = async (params: { msgContent: MSGBaseData; file: TFile }) => {
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
	} as MSGDataIndexed);
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

/**
 * This will search Indexed DB with the provided key and return Fuzzy Results
 * @param params
 * @returns
 */
export const searchMsgFilesWithKey = async (params: { key: string }) => {
	let allDBMessageContents = await getAllDBMessageContents();
	const results = fuzzysort.go(params.key, allDBMessageContents, {
		keys: ['subject', 'body', 'senderName'],
		threshold: -20000,
		scoreFn: (a) => {
			const search = params.key.toLowerCase();
			const exactMatch = a[1]?.target.toLowerCase().includes(search);
			if (exactMatch) {
				return 0;
			} else {
				// Use the original fuzzysort score for all other matches
				let subjectScore = a[0] ? a[0].score : -1000;
				let bodyScore = a[1] ? a[1].score : -1000;
				let senderNameScore = a[2] ? a[2].score : -1000;
				return Math.max(subjectScore, bodyScore, senderNameScore);
			}
		},
	});
	return results;
};

/**
 * Pass the string coming from fuzzysort, which includes <mark> items to hightlight
 * matches within the text. It will return appropriate part of the text to show
 * within the Search results to occupy less place and show relevant part
 * @param txt
 * @returns
 */
export const getHighlightedPartOfSearchResult = (txt: string) => {
	const firstStrongIndex = txt.indexOf('<mark class="oz-highlight">');
	const lastStrongIndex = txt.lastIndexOf('</mark>');

	// Get the start and end indices for the highlighted text
	const startWordIndex = txt.lastIndexOf(' ', firstStrongIndex - 2) + 1;
	const endWordIndex = txt.indexOf(' ', lastStrongIndex + 9);

	// Add 5 words before and after the highlighted text
	const startIndex = Math.max(startWordIndex - 5, 0);
	const endIndex = Math.min(endWordIndex + 5, txt.length);

	return txt.substring(startIndex, endIndex);
};
