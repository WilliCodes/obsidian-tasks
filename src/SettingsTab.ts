import { PluginSettingTab, Setting } from 'obsidian';

import {
    getSettings,
    joinInputArray,
    splitInputArray,
    updateSettings,
} from './Settings';
import type TasksPlugin from './main';

export class SettingsTab extends PluginSettingTab {
    private readonly plugin: TasksPlugin;

    constructor({ plugin }: { plugin: TasksPlugin }) {
        super(plugin.app, plugin);

        this.plugin = plugin;
    }

    public display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Tasks Settings' });
        containerEl.createEl('p', {
            cls: 'tasks-setting-important',
            text: 'Changing any settings requires a restart of obsidian.',
        });

        new Setting(containerEl)
            .setName('Global task filter')
            .setDesc(
                'The global filter will be applied to all checklist items.',
            )
            .addText((text) => {
                const settings = getSettings();

                text.setPlaceholder('#task')
                    .setValue(settings.globalFilter)
                    .onChange(async (value) => {
                        updateSettings({ globalFilter: value });

                        await this.plugin.saveSettings();
                    });
            });
        containerEl.createEl('div', {
            cls: 'setting-item-description',
            text:
                'The global filter will be applied to all checklist items to filter out "non-task" checklist items.\n' +
                'A checklist item must include the specified string in its description in order to be considered a task.\n' +
                'For example, if you set the global filter to `#task`, the Tasks plugin will only handle checklist items tagged with `#task`.\n' +
                'Other checklist items will remain normal checklist items and not appear in queries or get a done date set.\n' +
                'Leave empty if you want all checklist items from your vault to be tasks managed by this plugin.',
        });

        new Setting(containerEl)
            .setName('Remove global filter from description')
            .setDesc(
                'Enabling this removes the string that you set as global filter from the task description when displaying a task.',
            )
            .addToggle((toggle) => {
                const settings = getSettings();

                toggle
                    .setValue(settings.removeGlobalFilter)
                    .onChange(async (value) => {
                        updateSettings({ removeGlobalFilter: value });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Add time to completed tasks')
            .setDesc(
                'When completing a task, append the date and time instead of just the date.',
            )
            .addToggle((toggle) => {
                const settings = getSettings();

                toggle.setValue(settings.doneTime).onChange(async (value) => {
                    updateSettings({ doneTime: value });

                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Due date signifiers')
            .setDesc(
                'Signifies the start of the due date. The signifiers must not be used in the task\'s description. Separate additional possible signifiers with "&&". All signifiers can be read, while the first will be used for new tasks.',
            )
            .addText((text) => {
                const settings = getSettings();

                text.setPlaceholder('📅')
                    .setValue(joinInputArray(settings.dueDateSignifiers))
                    .onChange(async (value) => {
                        updateSettings({
                            dueDateSignifiers: splitInputArray(value),
                        });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Done date signifiers')
            .setDesc(
                'Signifies the start of the done date. The signifiers must not be used in the task\'s description. Separate additional possible signifiers with "&&". All signifiers can be read, while the first will be used for new tasks.',
            )
            .addText((text) => {
                const settings = getSettings();

                text.setPlaceholder('✅')
                    .setValue(joinInputArray(settings.doneDateSignifiers))
                    .onChange(async (value) => {
                        updateSettings({
                            doneDateSignifiers: splitInputArray(value),
                        });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Recurrence signifiers')
            .setDesc(
                'Signifies the rule for recurring tasks. The signifiers must not be used in the task\'s description. Separate additional possible signifiers with "&&". All signifiers can be read, while the first will be used for new tasks.',
            )
            .addText((text) => {
                const settings = getSettings();

                text.setPlaceholder('🔁')
                    .setValue(joinInputArray(settings.recurrenceSignifiers))
                    .onChange(async (value) => {
                        updateSettings({
                            recurrenceSignifiers: splitInputArray(value),
                        });

                        await this.plugin.saveSettings();
                    });
            });

        containerEl.createEl('h3', { text: 'Date Time Formats' });
        containerEl.createEl('p', {
            text: 'Customize the date and time formats used for parsing and displaying. Escape characters not used for parsing in square brackets, escape square brackets with a backslash (e.g. "\\[\\[YYYY-MM-DD\\]\\] [at] HH:mm")',
        });

        new Setting(containerEl)
            .setName('Date formats')
            .setDesc(
                'Formats to display dates (without time). Separate additional possible formats with "&&". All formats can be read, while the first format will be used for new tasks.',
            )
            .addText((text) => {
                const settings = getSettings();

                text.setPlaceholder('YYYY-MM-DD')
                    .setValue(joinInputArray(settings.dateFormats))
                    .onChange(async (value) => {
                        updateSettings({
                            dateFormats: splitInputArray(value),
                        });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Date and time formats')
            .setDesc(
                'Formats to display dates with time. Separate additional possible formats with "&&". All formats can be read, while the first format will be used for new tasks.',
            )
            .addText((text) => {
                const settings = getSettings();

                text.setPlaceholder('YYYY-MM-DD HH:mm')
                    .setValue(joinInputArray(settings.dateTimeFormats))
                    .onChange(async (value) => {
                        updateSettings({
                            dateTimeFormats: splitInputArray(value),
                        });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Time format')
            .setDesc('Format to display times (without date).')
            .addText((text) => {
                const settings = getSettings();

                text.setPlaceholder('HH:mm')
                    .setValue(settings.timeFormat)
                    .onChange(async (value) => {
                        updateSettings({ timeFormat: value });

                        await this.plugin.saveSettings();
                    });
            });
    }
}
