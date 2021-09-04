<script lang='ts'>
    import chrono from 'chrono-node';
    import { RRule } from 'rrule';
    import { onMount } from 'svelte';
    import { getSettings } from '../Settings';
    import { Status, Task } from '../Task';


    export let task: Task;
    export let onSubmit: (updatedTasks: Task[]) => void | Promise<void>;

    let descriptionInput: HTMLInputElement;
    let editableTask: {
        description: string;
        status: Status;
        recurrenceRule: string;
        dueDateTime: string;
        doneDateTime: string;
    } = {
        description: '',
        status: Status.Todo,
        recurrenceRule: '',
        dueDateTime: '',
        doneDateTime: '',
    };

    let parsedDueDateTime: string = '';
    let parsedRRule: string = '';
    let parsedDoneDateTime: string = '';

    const { dateTimeFormats, dateFormats, dueDateSignifiers, recurrenceSignifiers } = getSettings();

    $: {
        parsedDueDateTime = parseDateTimeToString(editableTask.dueDateTime);
    }

    $: {
        if (!editableTask.recurrenceRule) {
            parsedRRule = '<i>not recurring</>'
        } else {
            try {
                parsedRRule = RRule.fromText(editableTask.recurrenceRule).toText();
            } catch {
                parsedRRule = '<i>invalid recurrence rule</i>'
            }
        }
    }

    $: {
        parsedDoneDateTime = parseDateTimeToString(editableTask.doneDateTime);
    }

    const parseDateTimeToString = (input: string): string => {
        if (!input) {
            return '<i>no done date</>';
        }

        const parsed = window.moment(input, [...dateTimeFormats, ...dateFormats], true);
        if (parsed.isValid()) {
            // input could be directly parsed in strict mode
            return input;
        }

        // try to parse other formats or natural language
        const parsed_nl = chrono.parse(input, new Date(), { forwardDate: true });
        if (parsed_nl !== null && parsed_nl.length > 0) {
                const result = parsed_nl[0].start;
                if (result.isCertain('hour')) {
                    return window.moment(result.date()).format(dateTimeFormats[0]);
                } else {
                    return window.moment(result.date()).format(dateFormats[0]);
                }
        }

        return '<i>invalid done date</i>';
    }

    onMount(() => {
        const { globalFilter, dateTimeFormats, dateFormats } = getSettings();
        const description = task.description.replace(globalFilter, '').replace('  ', ' ').trim();

        let dueDateTime: string = '';
        let doneDateTime: string = '';
        if (task.dueDateTime) {
            if (task.hasDueTime) {
                dueDateTime = task.dueDateTime.format(dateTimeFormats[0]);
            } else {
                dueDateTime = task.dueDateTime.format(dateFormats[0]);
            }
        }

        if (task.doneDateTime) {
            if (task.hasDoneTime) {
                doneDateTime = task.doneDateTime.format(dateTimeFormats[0]);
            } else {
                doneDateTime = task.doneDateTime.format(dateFormats[0]);
            }
        }

        editableTask = {
            description,
            status: task.status,
            recurrenceRule: task.recurrenceRule ? task.recurrenceRule.toText() : '',
            dueDateTime,
            doneDateTime,
         };
        setTimeout(() => {descriptionInput.focus();}, 10);
    });

    const _onSubmit = () => {
        const { globalFilter } = getSettings();
        let description = editableTask.description.trim();
        if (!description.includes(globalFilter)) {
            description = globalFilter + ' ' + description;
        }

        let recurrenceRule: RRule | null = null;
        try {
            if (editableTask.recurrenceRule) {
                recurrenceRule = RRule.fromText(editableTask.recurrenceRule);
            }
        } catch {/*nothing to do*/}

        let dueDateTime: moment.Moment | null = null;
        let hasDueTime: boolean = false; 

        dueDateTime = window.moment(parsedDueDateTime, [...dateTimeFormats, ...dateFormats], true);
        if (dueDateTime.isValid()) {
            if (dateTimeFormats.includes(dueDateTime.creationData().format!.toString())) {
                        hasDueTime = true;
                    } else {
                        dueDateTime = dueDateTime.startOf('day');
                    }
        } else {
            dueDateTime = null;
        }

        let doneDateTime: moment.Moment | null = null;
        let hasDoneTime: boolean = false; 
        
        doneDateTime = window.moment(parsedDoneDateTime, [...dateTimeFormats, ...dateFormats], true);
        if (doneDateTime.isValid()) {
            if (dateTimeFormats.includes(doneDateTime.creationData().format!.toString())) {
                        hasDoneTime = true;
                    } else {
                        doneDateTime = doneDateTime.startOf('day');
                    }
        } else {
            doneDateTime = null;
        }

        const updatedTask = new Task({
            ...task,
            description,
            status: editableTask.status,
            recurrenceRule,
            dueDateTime,
            hasDueTime,
            doneDateTime,
            hasDoneTime,
        });

        onSubmit([updatedTask]);
    };
</script>

<div class="tasks-modal">
    <form on:submit|preventDefault={_onSubmit}>
        <div class="tasks-modal-section">
            <label for="description">Description</label>
            <input bind:value={editableTask.description} bind:this={descriptionInput} id="description" type="text" class="tasks-modal-description" placeholder="Take out the trash" />
        </div>
        <hr />
        <div class="tasks-modal-section">
            <label for="due">Due</label>
            <input bind:value={editableTask.dueDateTime} id="due" type="text" placeholder="Try 'Monday' or 'tomorrow at 5pm'." />
            <code>{@html dueDateSignifiers[0]} {@html parsedDueDateTime}</code>
        </div>
        <hr />
        <div class="tasks-modal-section">
            <label for="recurrence">Recurrence</label>
            <input bind:value={editableTask.recurrenceRule} id="description" type="text" placeholder="Try 'every 2 weeks on Thursday'." />
            <code>{@html recurrenceSignifiers[0]} {@html parsedRRule }</code>
        </div>
        <hr />
        <div class="tasks-modal-section">
            <div>
                Status:
                <input type="checkbox" class="task-list-item-checkbox tasks-modal-checkbox" checked={editableTask.status === Status.Done} disabled />
                <code>{editableTask.status}</code>
            </div>
            <div>
                Done on:
                <code>{@html parsedDoneDateTime}</code>
            </div>
        </div>
        <hr />
        <div class="tasks-modal-section" />
        <div class="tasks-modal-section">
            <button type="submit" class="mod-cta">Apply</button>
        </div>
    </form>
</div>
