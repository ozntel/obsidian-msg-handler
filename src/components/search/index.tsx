import React, { useEffect, useState } from 'react';
import fuzzysort from 'fuzzysort';
import MsgHandlerPlugin from 'main';
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';
import { CgChevronDoubleUp, CgChevronDoubleDown } from 'react-icons/cg';
import { MSGDataIndexedSearchEligible } from 'types';
import { searchMsgFilesWithKey, getHighlightedPartOfSearchResult } from 'database';
import { getFileName, replaceNewLinesAndCarriages, openFile, openFileInNewTab } from 'utils';
import { TFile } from 'obsidian';

type SearchResultSingleItem = {
	result: Fuzzysort.KeysResult<MSGDataIndexedSearchEligible>;
	highlightedResult: string;
};
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
			let indexOfMaxScore = null;
			let exactMatch = false;
			// First check exact match
			if (result[0]?.target.toLowerCase().includes(searchKey.toLowerCase())) {
				indexOfMaxScore = 0;
				exactMatch = true;
			} else if (result[1]?.target.toLowerCase().includes(searchKey.toLowerCase())) {
				indexOfMaxScore = 1;
				exactMatch = true;
			} else if (result[2]?.target.toLowerCase().includes(searchKey.toLowerCase())) {
				indexOfMaxScore = 2;
				exactMatch = true;
			} else if (result[3]?.target.toLowerCase().includes(searchKey.toLowerCase())) {
				indexOfMaxScore = 3;
				exactMatch = true;
			} else if (result[4]?.target.toLowerCase().includes(searchKey.toLowerCase())) {
				indexOfMaxScore = 4;
				exactMatch = true;
			}
			// If no exact match, Get the best score from fields
			else {
				let senderNameScore = result[0] ? result[0].score : -100000;
				let senderEmailScore = result[1] ? result[1].score : -100000;
				let subjectScore = result[2] ? result[2].score : -100000;
				let bodyScore = result[3] ? result[3].score : -100000;
				let recipientsScore = result[4] ? result[4].score : -100000;
				let allScores = [senderNameScore, senderEmailScore, subjectScore, bodyScore, recipientsScore];
				indexOfMaxScore = allScores.indexOf(Math.max(...allScores));
			}
			// Get highligted html
			let highlightedResult = null;
			if (exactMatch) {
				// Prepare the exact match text manually
				let indexOfSearchMatch = result[indexOfMaxScore].target
					.toLowerCase()
					.indexOf(searchKey.toLowerCase());
				let lengthOfSearchKey = searchKey.length;
				let originalTextOfSearchKey = result[indexOfMaxScore].target.substring(
					indexOfSearchMatch,
					indexOfSearchMatch + lengthOfSearchKey
				);
				highlightedResult = result[indexOfMaxScore].target.replace(
					originalTextOfSearchKey,
					'<mark class="oz-highlight">' + originalTextOfSearchKey + '</mark>'
				);
			} else {
				highlightedResult = fuzzysort.highlight(
					result[indexOfMaxScore],
					'<mark class="oz-highlight">',
					'</mark>'
				);
			}

			// If there is a highlighted result, cleanup the new line signs
			if (highlightedResult) {
				highlightedResult = getHighlightedPartOfSearchResult({
					highlightedResult: replaceNewLinesAndCarriages(highlightedResult),
					searchKey: searchKey,
				});
			}

			// Push for display results
			currentSearchResults.push({
				result: result,
				highlightedResult: highlightedResult,
			});
		}

		// After obtaining all results, push into the component state
		setSearchResults(currentSearchResults);
	};

	// Cleanup the results if searchkey is empty
	useEffect(() => {
		if (searchKey === '') setSearchResults(null);
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
			<div className="search-result-container">
				{searchResults &&
					(searchResults.length > 0 ? (
						searchResults.map((searchResult) => {
							return (
								<SearchResultFileMatch
									searchResult={searchResult}
									allOpenStatus={allOpenStatus}
									plugin={plugin}
								/>
							);
						})
					) : (
						<div className="search-empty-state">No matches found</div>
					))}
			</div>
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
				<div className="search-result-file-matches">
					<div
						className="search-result-file-match"
						onClick={openFileClicked}
						dangerouslySetInnerHTML={{ __html: searchResult.highlightedResult }}
					/>
				</div>
			)}
		</div>
	);
};
