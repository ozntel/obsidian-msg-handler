import { FuzzySuggestModal, TFolder, App } from 'obsidian';

export class FolderToSaveSuggestionModal extends FuzzySuggestModal<TFolder> {
	app: App;
	fileName: string;
	fileToSave: Uint8Array;

	constructor(app: App, fileToSave: Uint8Array, fileName: string) {
		super(app);
		this.fileName = fileName;
		this.fileToSave = fileToSave;
	}

	getItemText(item: TFolder): string {
		return item.path;
	}

	getItems(): TFolder[] {
		return getAllFoldersInVault(this.app);
	}

	onChooseItem(item: TFolder, evt: MouseEvent | KeyboardEvent) {
		this.app.vault.adapter.writeBinary(item.path + '/' + this.fileName, this.fileToSave);
	}
}

function getAllFoldersInVault(app: App): TFolder[] {
	let folders: TFolder[] = [];
	let rootFolder = app.vault.getRoot();
	folders.push(rootFolder);
	function recursiveFx(folder: TFolder) {
		for (let child of folder.children) {
			if (child instanceof TFolder) {
				let childFolder: TFolder = child as TFolder;
				folders.push(childFolder);
				if (childFolder.children) recursiveFx(childFolder);
			}
		}
	}
	recursiveFx(rootFolder);
	return folders;
}
