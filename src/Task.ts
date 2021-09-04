import { Component, MarkdownRenderer } from 'obsidian';
import { RRule } from 'rrule';

import { replaceTaskWithTasks } from './File';
import { escapeRegExp, getSettings } from './Settings';
import { LayoutOptions } from './LayoutOptions';
import type { Moment } from 'moment';

export enum Status {
    Todo = 'Todo',
    Done = 'Done',
}

export class Task {
    public readonly status: Status;
    public readonly description: string;
    public readonly path: string;
    public readonly indentation: string;
    /** Line number where the section starts that contains this task. */
    public readonly sectionStart: number;
    /** The index of the nth task in its section. */
    public readonly sectionIndex: number;
    /**
     * The original character from within `[]` in the document.
     * Required to be added to the LI the same way obsidian does as a `data-task` attribute.
     */
    public readonly originalStatusCharacter: string;
    public readonly precedingHeader: string | null;
    public readonly dueDateTime: Moment | null;
    public readonly hasDueTime: boolean;
    public readonly doneDateTime: Moment | null;
    public readonly hasDoneTime: boolean;
    public readonly recurrenceRule: RRule | null;
    /** The blockLink is a "^" annotation after the dates/recurrence rules. */
    public readonly blockLink: string;

    public static readonly taskRegex = /^([\s\t]*)[-*] +\[(.)\] *(.*)/u;
    public static readonly blockLinkRegex = / \^[a-zA-Z0-9-]+$/u;

    constructor({
        status,
        description,
        path,
        indentation,
        sectionStart,
        sectionIndex,
        originalStatusCharacter,
        precedingHeader,
        dueDateTime,
        hasDueTime,
        doneDateTime,
        hasDoneTime,
        recurrenceRule,
        blockLink,
    }: {
        status: Status;
        description: string;
        path: string;
        indentation: string;
        sectionStart: number;
        sectionIndex: number;
        originalStatusCharacter: string;
        precedingHeader: string | null;
        dueDateTime: moment.Moment | null;
        hasDueTime: boolean;
        doneDateTime: moment.Moment | null;
        hasDoneTime: boolean;
        recurrenceRule: RRule | null;
        blockLink: string;
    }) {
        this.status = status;
        this.description = description;
        this.path = path;
        this.indentation = indentation;
        this.sectionStart = sectionStart;
        this.sectionIndex = sectionIndex;
        this.originalStatusCharacter = originalStatusCharacter;
        this.precedingHeader = precedingHeader;
        this.dueDateTime = dueDateTime;
        this.hasDueTime = hasDueTime;
        this.doneDateTime = doneDateTime;
        this.hasDoneTime = hasDoneTime;
        this.recurrenceRule = recurrenceRule;
        this.blockLink = blockLink;
    }

    public static fromLine({
        line,
        path,
        sectionStart,
        sectionIndex,
        precedingHeader,
    }: {
        line: string;
        path: string;
        sectionStart: number;
        sectionIndex: number;
        precedingHeader: string | null;
    }): Task | null {
        const regexMatch = line.match(Task.taskRegex);
        if (regexMatch === null) {
            return null;
        }

        const indentation = regexMatch[1];
        const statusString = regexMatch[2].toLowerCase();

        let status: Status;
        switch (statusString) {
            case ' ':
                status = Status.Todo;
                break;
            default:
                status = Status.Done;
        }

        // match[3] includes the whole body of the task after the brackets.
        const body = regexMatch[3].trim();

        const { globalFilter } = getSettings();
        if (!body.includes(globalFilter)) {
            return null;
        }

        let description = body;

        const blockLinkMatch = description.match(this.blockLinkRegex);
        const blockLink = blockLinkMatch !== null ? blockLinkMatch[0] : '';

        if (blockLink !== '') {
            description = description.replace(this.blockLinkRegex, '').trim();
        }

        const {
            dueDateSignifiers,
            doneDateSignifiers,
            recurrenceSignifiers: recurringSignifiers,
            dateTimeFormats,
            dateFormats,
        } = getSettings();

        const allDueDateSignifiers =
            '(?:' +
            dueDateSignifiers.map((s) => escapeRegExp(s)).join('|') +
            ')';
        const allDoneDateSignifiers =
            '(?:' +
            doneDateSignifiers.map((s) => escapeRegExp(s)).join('|') +
            ')';
        const allRecurringSignifiers =
            '(?:' +
            recurringSignifiers.map((s) => escapeRegExp(s)).join('|') +
            ')';

        const dueDateTimeRegex = RegExp(allDueDateSignifiers + ' ?(.+)$', 'u');
        const doneDateTimeRegex = RegExp(
            allDoneDateSignifiers + ' ?(.+)$',
            'u',
        );
        const recurrenceRegex = RegExp(
            allRecurringSignifiers + '([a-zA-Z0-9, !]+)$',
            'u',
        );

        // Keep matching and removing special strings from the end of the
        // description in any order. The loop should only run once if the
        // strings are in the expected order after the description.
        let matched: boolean;
        let dueDateTime: Moment | null = null;
        let hasDueTime: boolean = false;
        let doneDateTime: Moment | null = null;
        let hasDoneTime: boolean = false;
        let recurrenceRule: RRule | null = null;
        // Add a "max runs" failsafe to never end in an endless loop:
        const maxRuns = 4;
        let runs = 0;
        do {
            matched = false;

            const doneDateTimeMatch = description.match(doneDateTimeRegex);
            if (doneDateTimeMatch !== null) {
                const parsed = window.moment(
                    doneDateTimeMatch[1],
                    [...dateTimeFormats, ...dateFormats],
                    true,
                );
                if (parsed.isValid()) {
                    doneDateTime = parsed;
                    if (
                        dateTimeFormats.includes(
                            parsed.creationData().format!.toString(),
                        )
                    ) {
                        hasDoneTime = true;
                    } else {
                        // make sure no implied time is used which would mess with comparisons
                        doneDateTime.set({ hour: 0, minute: 0 });
                    }
                } else {
                    console.warn('Could not parse done date');
                }
                description = description.replace(doneDateTimeRegex, '').trim();
                matched = true;
            }

            const dueDateTimeMatch = description.match(dueDateTimeRegex);
            if (dueDateTimeMatch !== null) {
                const parsed = window.moment(
                    dueDateTimeMatch[1],
                    [...dateTimeFormats, ...dateFormats],
                    true,
                );
                if (parsed.isValid()) {
                    dueDateTime = parsed;
                    if (
                        dateTimeFormats.includes(
                            parsed.creationData().format!.toString(),
                        )
                    ) {
                        hasDueTime = true;
                    } else {
                        // make sure no implied time is used which would mess with comparisons
                        dueDateTime.set({ hour: 0, minute: 0 });
                    }
                } else {
                    console.warn('Could not parse due date');
                }
                description = description.replace(dueDateTimeRegex, '').trim();
                matched = true;
            }

            const recurrenceMatch = description.match(recurrenceRegex);
            if (recurrenceMatch !== null) {
                try {
                    recurrenceRule = RRule.fromText(recurrenceMatch[1].trim());
                } catch (error) {
                    // Could not read recurrence rule. User possibly not done typing.
                }

                description = description.replace(recurrenceRegex, '').trim();
                matched = true;
            }

            runs++;
        } while (matched && runs <= maxRuns);

        const task = new Task({
            status,
            description,
            path,
            indentation,
            sectionStart,
            sectionIndex,
            originalStatusCharacter: statusString,
            precedingHeader,
            dueDateTime,
            hasDueTime,
            doneDateTime,
            hasDoneTime,
            recurrenceRule,
            blockLink,
        });

        return task;
    }

    public async toLi({
        parentUlElement,
        listIndex,
        layoutOptions,
    }: {
        parentUlElement: HTMLElement;
        /** The nth item in this list (including non-tasks). */
        listIndex: number;
        layoutOptions?: LayoutOptions;
    }): Promise<HTMLLIElement> {
        const li: HTMLLIElement = parentUlElement.createEl('li');
        li.addClasses(['task-list-item', 'plugin-tasks-list-item']);

        let taskAsString = this.toString(layoutOptions);
        const { globalFilter, removeGlobalFilter } = getSettings();
        if (removeGlobalFilter) {
            taskAsString = taskAsString.replace(globalFilter, '').trim();
        }

        await MarkdownRenderer.renderMarkdown(
            taskAsString,
            li,
            this.path,
            null as unknown as Component,
        );

        // Unwrap the p-tag that was created by the MarkdownRenderer:
        const pElement = li.querySelector('p');
        if (pElement !== null) {
            while (pElement.firstChild) {
                li.insertBefore(pElement.firstChild, pElement);
            }
            pElement.remove();
        }

        // Remove an empty trailing p-tag that the MarkdownRenderer appends when there is a block link:
        li.findAll('p').forEach((pElement) => {
            if (!pElement.hasChildNodes()) {
                pElement.remove();
            }
        });

        // Remove the footnote that the MarkdownRenderer appends when there is a footnote in the task:
        li.findAll('.footnotes').forEach((footnoteElement) => {
            footnoteElement.remove();
        });

        const checkbox = li.createEl('input');
        checkbox.addClass('task-list-item-checkbox');
        checkbox.type = 'checkbox';
        if (this.status !== Status.Todo) {
            checkbox.checked = true;
            li.addClass('is-checked');
        }
        checkbox.onClickEvent((event: MouseEvent) => {
            event.preventDefault();
            // It is required to stop propagation so that obsidian won't write the file with the
            // checkbox (un)checked. Obsidian would write after us and overwrite our change.
            event.stopPropagation();

            // Should be re-rendered as enabled after update in file.
            checkbox.disabled = true;
            const toggledTasks = this.toggle();
            replaceTaskWithTasks({
                originalTask: this,
                newTasks: toggledTasks,
            });
        });

        li.prepend(checkbox);

        // Set these to be compatible with stock obsidian lists:
        li.setAttr('data-task', this.originalStatusCharacter.trim()); // Trim to ensure empty attribute for space. Same way as obsidian.
        li.setAttr('data-line', listIndex);
        checkbox.setAttr('data-line', listIndex);

        return li;
    }

    public toString(layoutOptions?: LayoutOptions): string {
        layoutOptions = layoutOptions ?? new LayoutOptions();
        const {
            dateTimeFormats,
            timeFormat,
            dateFormats,
            dueDateSignifiers,
            doneDateSignifiers,
            recurrenceSignifiers,
        } = getSettings();
        let taskString = this.description;

        if (!layoutOptions.hideRecurrenceRule) {
            const recurrenceRule: string = this.recurrenceRule
                ? ` ${recurrenceSignifiers[0]} ${this.recurrenceRule.toText()}`
                : '';
            taskString += recurrenceRule;
        }

        if (this.dueDateTime) {
            if (
                !layoutOptions.hideDueDate &&
                !layoutOptions.hideDueTime &&
                this.hasDueTime
            ) {
                taskString += ` ${
                    dueDateSignifiers[0]
                } ${this.dueDateTime.format(dateTimeFormats[0])}`;
            } else if (!layoutOptions.hideDueDate) {
                taskString += ` ${
                    dueDateSignifiers[0]
                } ${this.dueDateTime.format(dateFormats[0])}`;
            } else if (!layoutOptions.hideDueTime && this.hasDueTime) {
                taskString += ` ${
                    dueDateSignifiers[0]
                } ${this.dueDateTime.format(timeFormat)}`;
            }
        }

        if (this.doneDateTime) {
            if (
                !layoutOptions.hideDoneDate &&
                !layoutOptions.hideDoneTime &&
                this.hasDoneTime
            ) {
                taskString += ` ${
                    doneDateSignifiers[0]
                } ${this.doneDateTime.format(dateTimeFormats[0])}`;
            } else if (!layoutOptions.hideDoneDate) {
                taskString += ` ${
                    doneDateSignifiers[0]
                } ${this.doneDateTime.format(dateFormats[0])}`;
            } else if (!layoutOptions.hideDoneTime && this.hasDoneTime) {
                taskString += ` ${
                    doneDateSignifiers[0]
                } ${this.doneDateTime.format(timeFormat)}`;
            }
        }

        return taskString;
    }

    public toFileLineString(): string {
        return `${this.indentation}- [${
            this.originalStatusCharacter
        }] ${this.toString()}`;
    }

    /**
     * Toggles this task and returns the resulting tasks.
     *
     * Toggling can result in more than one returned task in the case of
     * recurrence. If it is a recurring task, the toggled task will be returned
     * toether with the next occurrence in the order `[next, toggled]`. If the
     * task is not recurring, it will return `[toggled]`.
     */
    public toggle(): Task[] {
        const newStatus: Status =
            this.status === Status.Todo ? Status.Done : Status.Todo;
        let newDoneDateTime = null;
        let nextOccurrence: Moment | undefined;
        if (newStatus !== Status.Todo) {
            newDoneDateTime = window.moment();

            // If this task is no longer todo, we need to check if it is recurring:
            if (this.recurrenceRule !== null) {
                // If no due date, next occurrence is after "today".
                const dtStart: Moment =
                    this.dueDateTime !== null
                        ? this.dueDateTime.clone()
                        : window.moment();
                // RRule disregards the timezone:
                dtStart.endOf('day').utc(true);

                // Create a new rrule with `dtstart` set so that the date of
                // the new occurrence is calculated based on the original due
                // date and not based on today.
                const rrule = new RRule({
                    ...this.recurrenceRule.options,
                    dtstart: dtStart.toDate(),
                });

                // The next occurrence should happen after today or the due
                // date, whatever is later.
                const today = window.moment().endOf('day').utc(true);
                const after = today.isAfter(dtStart) ? today : dtStart;
                const next = rrule.after(after.toDate(), false);

                if (next !== null) {
                    // Re-add the timezone that RRule disregarded:
                    nextOccurrence = window.moment.utc(next);

                    if (this.dueDateTime) {
                        // Keep time of previous due date
                        const prevTime = {
                            hours: this.dueDateTime.hours(),
                            minutes: this.dueDateTime.minutes(),
                        };
                        nextOccurrence.set(prevTime);
                    }
                }
            }
        }

        const toggledTask = new Task({
            ...this,
            status: newStatus,
            doneDateTime: newDoneDateTime,
            hasDoneTime: getSettings().doneTime,
            originalStatusCharacter: newStatus === Status.Done ? 'x' : ' ',
        });

        const newTasks: Task[] = [];

        if (nextOccurrence !== undefined) {
            const nextTask = new Task({
                ...this,
                dueDateTime: nextOccurrence,
                // New occurrences cannot have the same block link.
                // And random block links don't help.
                blockLink: '',
            });
            newTasks.push(nextTask);
        }

        // Write next occurrence before previous occurrence.
        newTasks.push(toggledTask);

        return newTasks;
    }
}
