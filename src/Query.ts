import * as chrono from 'chrono-node';
import { LayoutOptions } from './LayoutOptions';

import { Status, Task } from './Task';

type Sorting = 'status' | 'due' | 'done' | 'path' | 'description';

export class Query {
    private _limit: number | undefined = undefined;
    private _layoutOptions: LayoutOptions = new LayoutOptions();
    private _filters: ((task: Task) => boolean)[] = [];
    private _error: string | undefined = undefined;
    private _sorting: Sorting[] = [];

    private readonly noDueDateString = 'no due date';
    private readonly noDueTimeString = 'no due time';
    private readonly dueRegexp = /^due (before|after|on)? ?(.*)/;

    private readonly doneString = 'done';
    private readonly notDoneString = 'not done';
    private readonly doneRegexp = /^done (before|after|on)? ?(.*)/;

    private readonly pathRegexp = /^path (includes|does not include) (.*)/;
    private readonly descriptionRegexp =
        /^description (includes|does not include) (.*)/;
    private readonly sortByRegexp =
        /^sort by (status|due|done|path|description)/;

    private readonly headingRegexp =
        /^heading (includes|does not include) (.*)/;

    private readonly hideOptionsRegexp =
        /^hide (task count|backlink|done date|done time|due date|due time|recurrence rule|edit button)/;

    private readonly recurringString = 'is recurring';
    private readonly notRecurringString = 'is not recurring';

    private readonly limitRegexp = /^limit (to )?(\d+)( tasks?)?/;
    private readonly excludeSubItemsString = 'exclude sub-items';

    constructor({ source }: { source: string }) {
        source
            .split('\n')
            .map((line: string) => line.trim())
            .forEach((line: string) => {
                switch (true) {
                    case line === '':
                        break;
                    case line === this.doneString:
                        this._filters.push(
                            (task) => task.status === Status.Done,
                        );
                        break;
                    case line === this.notDoneString:
                        this._filters.push(
                            (task) => task.status !== Status.Done,
                        );
                        break;
                    case line === this.recurringString:
                        this._filters.push(
                            (task) => task.recurrenceRule !== null,
                        );
                        break;
                    case line === this.notRecurringString:
                        this._filters.push(
                            (task) => task.recurrenceRule === null,
                        );
                        break;
                    case line === this.excludeSubItemsString:
                        this._filters.push((task) => task.indentation === '');
                        break;
                    case line === this.noDueDateString:
                        this._filters.push((task) => task.dueDateTime === null);
                        break;
                    case line === this.noDueTimeString:
                        this._filters.push((task) => !task.hasDueTime);
                        break;
                    case this.dueRegexp.test(line):
                        this.parseDueFilter({ line });
                        break;
                    case this.doneRegexp.test(line):
                        this.parseDoneFilter({ line });
                        break;
                    case this.pathRegexp.test(line):
                        this.parsePathFilter({ line });
                        break;
                    case this.descriptionRegexp.test(line):
                        this.parseDescriptionFilter({ line });
                        break;
                    case this.headingRegexp.test(line):
                        this.parseHeadingFilter({ line });
                        break;
                    case this.limitRegexp.test(line):
                        this.parseLimit({ line });
                        break;
                    case this.sortByRegexp.test(line):
                        this.parseSortBy({ line });
                        break;
                    case this.hideOptionsRegexp.test(line):
                        this.parseHideOptions({ line });
                        break;
                    default:
                        this._error = 'do not understand query';
                }
            });
    }

    public get limit(): number | undefined {
        return this._limit;
    }

    public get layoutOptions(): LayoutOptions {
        return this._layoutOptions;
    }

    public get filters(): ((task: Task) => boolean)[] {
        return this._filters;
    }

    public get sorting(): Sorting[] {
        return this._sorting;
    }

    public get error(): string | undefined {
        return this._error;
    }

    private parseHideOptions({ line }: { line: string }): void {
        const hideOptionsMatch = line.match(this.hideOptionsRegexp);
        if (hideOptionsMatch !== null) {
            const option = hideOptionsMatch[1].trim().toLowerCase();

            if (option === 'task count') {
                this._layoutOptions.hideTaskCount = true;
            } else if (option === 'backlink') {
                this._layoutOptions.hideBacklinks = true;
            } else if (option === 'done date') {
                this._layoutOptions.hideDoneDate = true;
            } else if (option === 'done time') {
                this._layoutOptions.hideDoneTime = true;
            } else if (option === 'due date') {
                this._layoutOptions.hideDueDate = true;
            } else if (option === 'due time') {
                this._layoutOptions.hideDueTime = true;
            } else if (option === 'recurrence rule') {
                this._layoutOptions.hideRecurrenceRule = true;
            } else if (option === 'edit button') {
                this._layoutOptions.hideEditButton = true;
            } else {
                this._error = 'do not understand hide option';
            }
        }
    }

    private parseDueFilter({ line }: { line: string }): void {
        const dueMatch = line.match(this.dueRegexp);
        if (dueMatch !== null) {
            const parsedDueDate = chrono.parse(dueMatch[2])?.[0]?.start;
            if (!parsedDueDate) {
                this._error = 'do not understand due date';
            }
            const parsedWithTime = parsedDueDate.isCertain('hour');
            let filterDate = window.moment(parsedDueDate.date());

            let filter;
            if (dueMatch[1] === 'before') {
                if (!parsedWithTime) {
                    filterDate = filterDate.startOf('day');
                }
                filter = (task: Task) =>
                    task.dueDateTime
                        ? task.dueDateTime.isBefore(filterDate)
                        : false;
            } else if (dueMatch[1] === 'after') {
                if (!parsedWithTime) {
                    filterDate = filterDate.endOf('day');
                }
                filter = (task: Task) =>
                    task.dueDateTime
                        ? task.dueDateTime.isAfter(filterDate)
                        : false;
            } else {
                if (!parsedWithTime) {
                    filter = (task: Task) =>
                        task.dueDateTime
                            ? task.dueDateTime.isSame(filterDate, 'day')
                            : false;
                } else {
                    // use 'minute' granularity to allow for equality with 'now'
                    filter = (task: Task) =>
                        task.dueDateTime
                            ? task.dueDateTime.isSame(filterDate, 'minute')
                            : false;
                }
            }

            this._filters.push(filter);
        } else {
            this._error = 'do not understand query filter (due date)';
        }
    }

    private parseDoneFilter({ line }: { line: string }): void {
        const doneMatch = line.match(this.doneRegexp);
        if (doneMatch !== null) {
            const parsedDoneDate = chrono.parse(doneMatch[2])?.[0]?.start;
            if (!parsedDoneDate) {
                this._error = 'do not understand done date';
            }
            const parsedWithTime = parsedDoneDate.isCertain('hour');
            let filterDate = window.moment(parsedDoneDate.date());

            let filter;
            if (doneMatch[1] === 'before') {
                if (!parsedWithTime) {
                    filterDate = filterDate.startOf('day');
                }
                filter = (task: Task) =>
                    task.doneDateTime
                        ? task.doneDateTime.isBefore(filterDate)
                        : false;
            } else if (doneMatch[1] === 'after') {
                if (!parsedWithTime) {
                    filterDate = filterDate.endOf('day');
                }
                filter = (task: Task) =>
                    task.doneDateTime
                        ? task.doneDateTime.isAfter(filterDate)
                        : false;
            } else {
                if (!parsedWithTime) {
                    filter = (task: Task) =>
                        task.doneDateTime
                            ? task.doneDateTime.isSame(filterDate, 'day')
                            : false;
                } else {
                    // use 'minute' granularity to allow for equality with 'now'
                    filter = (task: Task) =>
                        task.doneDateTime
                            ? task.doneDateTime.isSame(filterDate, 'minute')
                            : false;
                }
            }

            this._filters.push(filter);
        }
    }

    private parsePathFilter({ line }: { line: string }): void {
        const pathMatch = line.match(this.pathRegexp);
        if (pathMatch !== null) {
            const filterMethod = pathMatch[1];
            if (filterMethod === 'includes') {
                this._filters.push((task: Task) =>
                    this.stringIncludesCaseInsensitive(task.path, pathMatch[2]),
                );
            } else if (pathMatch[1] === 'does not include') {
                this._filters.push(
                    (task: Task) =>
                        !this.stringIncludesCaseInsensitive(
                            task.path,
                            pathMatch[2],
                        ),
                );
            } else {
                this._error = 'do not understand query filter (path)';
            }
        } else {
            this._error = 'do not understand query filter (path)';
        }
    }

    private parseDescriptionFilter({ line }: { line: string }): void {
        const descriptionMatch = line.match(this.descriptionRegexp);
        if (descriptionMatch !== null) {
            const filterMethod = descriptionMatch[1];
            if (filterMethod === 'includes') {
                this._filters.push((task: Task) =>
                    this.stringIncludesCaseInsensitive(
                        task.description,
                        descriptionMatch[2],
                    ),
                );
            } else if (descriptionMatch[1] === 'does not include') {
                this._filters.push(
                    (task: Task) =>
                        !this.stringIncludesCaseInsensitive(
                            task.description,
                            descriptionMatch[2],
                        ),
                );
            } else {
                this._error = 'do not understand query filter (description)';
            }
        } else {
            this._error = 'do not understand query filter (description)';
        }
    }

    private parseHeadingFilter({ line }: { line: string }): void {
        const headingMatch = line.match(this.headingRegexp);
        if (headingMatch !== null) {
            const filterMethod = headingMatch[1].toLowerCase();
            if (filterMethod === 'includes') {
                this._filters.push(
                    (task: Task) =>
                        task.precedingHeader !== null &&
                        this.stringIncludesCaseInsensitive(
                            task.precedingHeader,
                            headingMatch[2],
                        ),
                );
            } else if (headingMatch[1] === 'does not include') {
                this._filters.push(
                    (task: Task) =>
                        task.precedingHeader === null ||
                        !this.stringIncludesCaseInsensitive(
                            task.precedingHeader,
                            headingMatch[2],
                        ),
                );
            } else {
                this._error = 'do not understand query filter (heading)';
            }
        } else {
            this._error = 'do not understand query filter (heading)';
        }
    }

    private parseLimit({ line }: { line: string }): void {
        const limitMatch = line.match(this.limitRegexp);
        if (limitMatch !== null) {
            // limitMatch[2] is per regex always digits and therefore parsable.
            const limit = Number.parseInt(limitMatch[2], 10);
            this._limit = limit;
        } else {
            this._error = 'do not understand query limit';
        }
    }

    private parseSortBy({ line }: { line: string }): void {
        const fieldMatch = line.match(this.sortByRegexp);
        if (fieldMatch !== null) {
            this._sorting.push(fieldMatch[1] as Sorting);
        } else {
            this._error = 'do not understand query sorting';
        }
    }

    private stringIncludesCaseInsensitive(
        haystack: string,
        needle: string,
    ): boolean {
        return haystack
            .toLocaleLowerCase()
            .includes(needle.toLocaleLowerCase());
    }
}
