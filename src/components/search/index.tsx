import React, { useEffect, useState } from 'react';
import fuzzysort from 'fuzzysort';
import MsgHandlerPlugin from 'main';
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';
import { CgChevronDoubleUp, CgChevronDoubleDown } from 'react-icons/cg';
import { DBCustomMessage } from 'types';
import { searchMsgFilesWithKey } from 'database';
import {
	getFileName,
	getHighlightedPartOfSearchResult,
	replaceNewLinesAndCarriages,
	openFile,
	openFileInNewTab,
	openFileInNewTabGroup,
} from 'utils';
import { TFile } from 'obsidian';

type SearchResultSingleItem = { result: Fuzzysort.KeysResult<DBCustomMessage>; highlightedResult: string };
type SearchResultState = SearchResultSingleItem[];
type AllOpenStatus = 'open' | 'closed' | null;

/* ------------ SEARCH FULL VIEW RENDER ------------ */

export default function SearchViewComponent(params: { plugin: MsgHandlerPlugin }) {
	const { plugin } = params;

	const [searchKey, setSearchKey] = useState<string>();
	const [searchResults, setSearchResults] = useState<SearchResultState>();

	// Helper state to collapse/expand all (inherited in the child components)
	const [allOpenStatus, setAllOpenStatus] = useState<AllOpenStatus>();

	// --> Search Button Click or Enter Press
	const searchInit = async () => {
		let currentSearchResults = [];
		// Get search results
		let results = await searchMsgFilesWithKey({ key: searchKey });
		// Loop results to populate component state
		for (let result of results) {
			// Get highligted html
			let highlightedResult = fuzzysort.highlight(result[1], '<mark class="oz-highlight">', '</mark>');
			if (highlightedResult) {
				highlightedResult = getHighlightedPartOfSearchResult(
					replaceNewLinesAndCarriages(highlightedResult)
				);
			}
			currentSearchResults.push({
				result: result,
				highlightedResult: highlightedResult,
			});
		}
		setSearchResults(currentSearchResults);
	};

	useEffect(() => {
		if (searchKey === '') setSearchResults([]);
	}, [searchKey]);

	return (
		<div>
			<div className="oz-msg-handler-actions-items oz-msg-handler-header-fixed">
				<CgChevronDoubleUp
					className="oz-msg-handler-action-button"
					aria-label="Collapse All"
					onClick={() => setAllOpenStatus('closed')}
				/>
				<CgChevronDoubleDown
					className="oz-msg-handler-action-button"
					aria-label="Expand All"
					onClick={() => setAllOpenStatus('open')}
				/>
			</div>
			<div className="oz-searchbox-container">
				<input
					type="text"
					placeholder="Provide a search key"
					value={searchKey}
					onChange={(e) => {
						setSearchKey(e.target.value);
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							searchInit();
						}
					}}
				/>
			</div>
			{searchResults &&
				searchResults.map((searchResult) => {
					return (
						<SearchResultFileMatch
							searchResult={searchResult}
							allOpenStatus={allOpenStatus}
							plugin={plugin}
						/>
					);
				})}
		</div>
	);
}

/* ------------ SINGLE FILE MATCH RESULT VIEW ------------ */

const SearchResultFileMatch = (params: {
	plugin: MsgHandlerPlugin;
	searchResult: SearchResultSingleItem;
	allOpenStatus: AllOpenStatus;
}) => {
	const { searchResult, allOpenStatus, plugin } = params;
	const [open, setOpen] = useState<boolean>(true);

	useEffect(() => {
		if (allOpenStatus === 'open') {
			setOpen(true);
		} else if (allOpenStatus === 'closed') {
			setOpen(false);
		}
	}, [allOpenStatus]);

	const getCurrentAbstractFile = () => {
		return plugin.app.vault.getAbstractFileByPath(searchResult.result.obj.filePath);
	};

	const openFileClicked = () => {
		let file = getCurrentAbstractFile();
		if (file) {
			openFile({ file: file as TFile, plugin: plugin, newLeaf: false });
		}
	};

	// --> AuxClick (Mouse Wheel Button Action)
	const onAuxClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		let file = getCurrentAbstractFile();
		if (e.button === 1 && file) openFileInNewTab({ plugin: plugin, file: file as TFile });
	};

	return (
		<div key={searchResult.result.obj.filePath} className="tree-item search-result">
			<div className="tree-item-self search-result-file-title is-clickable">
				<div className="tree-item-icon collapse-icon">
					{open ? (
						<MdKeyboardArrowDown onClick={() => setOpen(false)} />
					) : (
						<MdKeyboardArrowRight onClick={() => setOpen(true)} />
					)}
				</div>
				<div className="tree-item-inner" onClick={openFileClicked} onAuxClick={onAuxClick}>
					{getFileName(searchResult.result.obj.filePath)}
				</div>
			</div>
			{open && searchResult.highlightedResult?.length > 0 && (
				<div
					className="search-result-file-matches"
					dangerouslySetInnerHTML={{ __html: searchResult.highlightedResult }}
				/>
			)}
		</div>
	);
};
