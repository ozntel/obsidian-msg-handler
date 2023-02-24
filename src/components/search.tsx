import MsgHandlerPlugin from 'main';
import React from 'react';

export default function SearchViewComponent(params: { plugin: MsgHandlerPlugin }) {
	const { plugin } = params;

	return <h1>Search View</h1>;
}
