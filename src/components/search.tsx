import MsgHandlerPlugin from 'main';
import React, { useState } from 'react';
import { searchMsgFilesWithKey } from 'database';
import fuzzysort from 'fuzzysort';

export default function SearchViewComponent(params: { plugin: MsgHandlerPlugin }) {
	const { plugin } = params;

	const [searchKey, setSearchKey] = useState<string>();

	const searchInit = async () => {
		let results = await searchMsgFilesWithKey({ key: searchKey });
		for (let result of results) {
			let highlightedResult = fuzzysort.highlight(result[1], '<strong>', '</strong>');
		}
	};

	return (
		<div>
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
	);
}
