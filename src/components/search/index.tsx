import React, { useEffect, useState, useRef } from 'react';
import fuzzysort from 'fuzzysort';
import MsgHandlerPlugin from 'main';
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';
import { CgChevronDoubleUp, CgChevronDoubleDown } from 'react-icons/cg';
import { MSGDataIndexedSearchEligible } from 'types';
import { searchMsgFilesWithKey, getHighlightedPartOfSearchResult } from 'database';
import { getFileName, replaceNewLinesAndCarriages, openFile, openFileInNewTab, isMouseEvent } from 'utils';
import { TFile, Menu } from 'obsidian';

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

	// Handle Search Promises in Order
	const promiseQueueRef = useRef([]);

	useEffect(() => {
		const runPromiseQueue = async () => {
			while (promiseQueueRef.current.length > 0) {
				const nextPromise = promiseQueueRef.current[0];
				try {
					await nextPromise();
				} catch (error) {
					if (plugin.settings.logEnabled) console.log('Search promise failed', error);
				} finally {
					promiseQueueRef.current.shift(); // remove the completed promise from the queue
				}
			}
		};

		if (searchKey === '' || searchKey === null || searchKey === undefined) {
			setSearchResults(null);
		} else {
			promiseQueueRef.current.push(runSearch);
			runPromiseQueue();
		}
	}, [searchKey]);

	// Cleanup the results if searchkey is empty
	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newSearchKey = event.target.value;
		setSearchKey(newSearchKey);
	};

	// --> Search Function using Current searchKey
	const runSearch = async () => {
		let currentSearchResults = [];
		// Get search results
		let results = await searchMsgFilesWithKey({ key: searchKey });
		// Loop results to populate component state
		for (let result of results) {
			let indexOfMaxScore = null;
			let exactMatch = false;
			// First check exact match
			const exactMatchIndex = result.findIndex((r) =>
				r?.target.toLowerCase().includes(searchKey.toLowerCase())
			);
			if (exactMatchIndex !== -1) {
				indexOfMaxScore = exactMatchIndex;
				exactMatch = true;
			}
			// If no exact match, Get the best score from fields
			else {
				const scores = result.map((r) => r?.score ?? -100000);
				indexOfMaxScore = scores.reduce(
					(maxIndex, score, index) => (score > scores[maxIndex] ? index : maxIndex),
					0
				);
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

	return (
		<div>
			<div className="oz-msg-handler-actions-items oz-msg-handler-header-fixed">
				<CgChevronDoubleUp
					className="oz-msg-handler-action-button"
					aria-label="Collapse All"
					onClick={() => setAllOpenStatus('closed')}
					size={20}
				/>
				<CgChevronDoubleDown
					className="oz-msg-handler-action-button"
					aria-label="Expand All"
					onClick={() => setAllOpenStatus('open')}
					size={20}
				/>
			</div>
			<div className="oz-searchbox-container">
				<input
					type="text"
					placeholder="Provide a search key"
					value={searchKey}
					onChange={handleInputChange}
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

	const openFileClicked = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		let file = getCurrentAbstractFile();
		if (file) {
			openFile({
				file: file as TFile,
				plugin: plugin,
				newLeaf: (e.ctrlKey || e.metaKey) && !(e.shiftKey || e.altKey),
				leafBySplit: (e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey),
			});
		}
	};

	// --> AuxClick (Mouse Wheel Button Action)
	const onAuxClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		let file = getCurrentAbstractFile();
		if (e.button === 1 && file) openFileInNewTab({ plugin: plugin, file: file as TFile });
	};

	// --> Context Menu
	const triggerContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		const fileMenu = new Menu();
		const filePath = searchResult.result.obj.filePath;
		const file = plugin.app.vault.getAbstractFileByPath(filePath);
		if (file) {
			plugin.app.workspace.trigger('file-menu', fileMenu, file, 'file-explorer');
			if (isMouseEvent) {
				fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
			}
		}
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
				<div
					className="tree-item-inner"
					onClick={openFileClicked}
					onAuxClick={onAuxClick}
					onContextMenu={triggerContextMenu}>
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
