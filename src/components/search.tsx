import React, { useState } from 'react';
import fuzzysort from 'fuzzysort';
import MsgHandlerPlugin from 'main';
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';
import { DBCustomMessage } from 'types';
import { searchMsgFilesWithKey } from 'database';
import { getFileName, getHighlightedPartOfSearchResult, replaceNewLinesAndCarriages } from 'utils';

type SearchResultSingleItem = { result: Fuzzysort.KeysResult<DBCustomMessage>; highlightedResult: string };
type SearchResultState = SearchResultSingleItem[];

/* ------------ SEARCH FULL VIEW RENDER ------------ */

export default function SearchViewComponent(params: { plugin: MsgHandlerPlugin }) {
	const { plugin } = params;

	const [searchKey, setSearchKey] = useState<string>();
	const [searchResults, setSearchResults] = useState<SearchResultState>();

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

	return (
		<div>
			<div className="oz-msg-handler-actions-items oz-msg-handler-header-fixed">
				<MdKeyboardArrowDown className="oz-msg-handler-action-button" />
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
					return <SearchResultFileMatch searchResult={searchResult} />;
				})}
		</div>
	);
}

/* ------------ SINGLE FILE MATCH RESULT VIEW ------------ */

const SearchResultFileMatch = (params: { searchResult: SearchResultSingleItem }) => {
	const { searchResult } = params;
	const [open, setOpen] = useState<boolean>(true);

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
				<div className="tree-item-inner">{getFileName(searchResult.result.obj.filePath)}</div>
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
