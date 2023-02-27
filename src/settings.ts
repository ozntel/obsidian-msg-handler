import MsgHandlerPlugin from 'main';
import { PluginSettingTab, Setting, App } from 'obsidian';

export interface MSGHandlerPluginSettings {
	searchEnabled: boolean;
	logEnabled: boolean;
}

export const DEFAULT_SETTINGS: MSGHandlerPluginSettings = {
	searchEnabled: true,
	logEnabled: false,
};

export class MSGHandlerPluginSettingsTab extends PluginSettingTab {
	plugin: MsgHandlerPlugin;

	constructor(app: App, plugin: MsgHandlerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		const tipDiv = containerEl.createDiv('tip');
		tipDiv.addClass('oz-msg-handler-tip-div');
		const tipLink = tipDiv.createEl('a', { href: 'https://revolut.me/ozante' });
		const tipImg = tipLink.createEl('img', {
			attr: {
				src: 'https://raw.githubusercontent.com/ozntel/file-tree-alternative/main/images/tip%20the%20artist_v2.png',
			},
		});
		tipImg.height = 55;

		const coffeeDiv = containerEl.createDiv('coffee');
		coffeeDiv.addClass('oz-msg-handler-coffee-div');
		const coffeeLink = coffeeDiv.createEl('a', { href: 'https://ko-fi.com/L3L356V6Q' });
		const coffeeImg = coffeeLink.createEl('img', {
			attr: {
				src: 'https://cdn.ko-fi.com/cdn/kofi2.png?v=3',
			},
		});
		coffeeImg.height = 45;

		/* ------------- Header ------------- */

		let headerSettings = containerEl.createEl('h1');
		headerSettings.innerText = 'MSG Handler Settings';

		/* ------------- General Settings ------------- */

		new Setting(containerEl)
			.setName('MSG Search View')
			.setDesc('Turn on if you want automatically to be opened Search View after each vault/plugin refresh')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.searchEnabled).onChange((value) => {
					this.plugin.settings.searchEnabled = value;
					this.plugin.saveSettings();
					if (value) {
						this.plugin.openMsgHandlerSearchLeaf({ showAfterAttach: true });
					} else {
						this.plugin.detachMsgHandlerSearchLeaf();
					}
				})
			);

		new Setting(containerEl)
			.setName('Plugin Logs in Console')
			.setDesc('Turn on if you want to see the plugin logs within the console for actions')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.logEnabled).onChange((value) => {
					this.plugin.settings.logEnabled = value;
					this.plugin.saveSettings();
				})
			);
	}
}
