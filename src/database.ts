import Dexie from 'dexie';
import { TFile } from 'obsidian';
import MsgHandlerPlugin from 'main';
import { MSGDataIndexed, MSGBaseData, MSGDataIndexedSearchEligible } from 'types';
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
	// Get all Message Contents from DB Indexed
	let allDBMessageContents: MSGDataIndexed[] = await getAllDBMessageContents();
	// Create New Variable to Store the Contents and Convert all Fields to String
	let searchConvenientMessageContents: MSGDataIndexedSearchEligible[] = allDBMessageContents.map(
		(messageContent) => ({
			...messageContent,
			recipients: messageContent.recipients.map((r) => r.name + ' <' + r.email + '>').join(', '),
		})
	);
	// Evaluate the fields and get the best result
	const results: Fuzzysort.KeysResults<MSGDataIndexedSearchEligible> = fuzzysort.go(
		params.key,
		searchConvenientMessageContents,
		{
			keys: ['senderName', 'senderEmail', 'subject', 'body', 'recipients'],
			threshold: -20000,
			scoreFn: (a) => {
				const searchKey = params.key.toLowerCase();
				const exactMatch =
					a[0]?.target.toLowerCase().includes(searchKey) ||
					a[1]?.target.toLowerCase().includes(searchKey) ||
					a[2]?.target.toLowerCase().includes(searchKey) ||
					a[3]?.target.toLowerCase().includes(searchKey) ||
					a[4]?.target.toLowerCase().includes(searchKey);
				if (exactMatch) {
					return 0;
				} else {
					// Use the original fuzzysort score for all other matches
					let senderNameScore = a[0] ? a[0].score : -100000;
					let senderEmailScore = a[1] ? a[1].score : -100000;
					let subjectScore = a[2] ? a[2].score : -100000;
					let bodyScore = a[3] ? a[3].score : -100000;
					let recipientsScore = a[4] ? a[4].score : -100000;
					return Math.max(senderNameScore, senderEmailScore, subjectScore, bodyScore, recipientsScore);
				}
			},
		}
	);
	return results;
};

/**
 * Pass the string coming from fuzzysort, which includes <mark> items to hightlight
 * matches within the text. It will return appropriate part of the text to show
 * within the Search results to occupy less place and show relevant part
 * @param txt
 * @returns
 */
export const getHighlightedPartOfSearchResult = (params: { highlightedResult: string; searchKey: string }) => {
	const { highlightedResult, searchKey } = params;

	let maxSearchDisplayLength = 120;

	if (highlightedResult.length < maxSearchDisplayLength) {
		return highlightedResult;
	} else {
		// "0123456789<mark class="oz-highlight">123</mark>1234567"   // 54
		const firstMarkIndex = highlightedResult.indexOf('<mark class="oz-highlight">'); // 10
		const lastMarkIndex = highlightedResult.lastIndexOf('</mark>'); // 40

		if (firstMarkIndex === 0 || lastMarkIndex === 0) {
			return highlightedResult;
		}

		const searchKeyLength = searchKey.length; // 3
		const lengthAfterHighlight = highlightedResult.length - (lastMarkIndex + 7); // 7
		const leftUsageLength = maxSearchDisplayLength - searchKeyLength; // 117
		const eachSideUsageLength = Math.floor(leftUsageLength / 2); // 58

		let startIndex = 0;
		let startMissing = 0; // couldn't get that many characters, add to end if possible
		if (firstMarkIndex > eachSideUsageLength) {
			// There is more than enough text, extract only limited text
			startIndex = firstMarkIndex - eachSideUsageLength;
		} else {
			// There wasn't enough text enough, try to attach to end
			startMissing = eachSideUsageLength - firstMarkIndex;
		}

		let endIndex = highlightedResult.length - 1;
		if (lengthAfterHighlight > eachSideUsageLength) {
			// There is more than enough text, extract only limited text
			endIndex = lastMarkIndex + 7 + eachSideUsageLength;
			// Try to add more if startMissing is more than 0
			let endLeftPlace = highlightedResult.length - 1 - endIndex;
			if (endLeftPlace > startMissing) {
				endIndex += startMissing;
			} else {
				endIndex = highlightedResult.length - 1;
			}
		} else {
			// There wasn't enough text at the end, try to attach to the start
			let endMissing = eachSideUsageLength - lengthAfterHighlight;
			if (endMissing > 0) {
				if (startIndex > endMissing) {
					startIndex = startIndex - endMissing;
				} else {
					startIndex = 0;
				}
			}
		}

		return '...' + highlightedResult.substring(startIndex, endIndex) + '...';
	}
};
