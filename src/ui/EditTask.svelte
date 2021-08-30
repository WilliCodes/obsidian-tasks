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

    $: {
        if (!editableTask.dueDateTime) {
            parsedDueDateTime = '<i>no due date</>'
        } else {
            const parsed = chrono.parse(editableTask.dueDateTime, new Date(), { forwardDate: true });
            if (parsed !== null && parsed.length > 0) {
                const result = parsed[0].start;
                if (result.isCertain('hour')) {
                    parsedDueDateTime = window.moment(result.date()).format(Task.dateTimeFormat);
                } else {
                    parsedDueDateTime = window.moment(result.date()).format(Task.dateFormat);
                }
            } else {
                parsedDueDateTime = '<i>invalid due date</i>'
            }
        }
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
        if (!editableTask.doneDateTime) {
            parsedDoneDateTime = '<i>no done date</i>'
        } else {
            const parsed = chrono.parse(editableTask.doneDateTime);
            if (parsed !== null && parsed.length > 0) {
                const result = parsed[0].start;
                if (result.isCertain('hour')) {
                    parsedDoneDateTime = window.moment(result.date()).format(Task.dateTimeFormat);
                } else {
                    parsedDoneDateTime = window.moment(result.date()).format(Task.dateFormat);
                }
            } else {
                parsedDoneDateTime = '<i>invalid done date</i>'
            }
        }
    }

    onMount(() => {
        const { globalFilter } = getSettings();
        const description = task.description.replace(globalFilter, '').replace('  ', ' ').trim();

        let dueDateTime: string = '';
        let doneDateTime: string = '';
        if (task.dueDateTime) {
            if (task.hasDueTime) {
                dueDateTime = task.dueDateTime.format(Task.dateTimeFormat);
            } else {
                dueDateTime = task.dueDateTime.format(Task.dateFormat);
            }
        }

        if (task.doneDateTime) {
            if (task.hasDoneTime) {
                doneDateTime = task.doneDateTime.format(Task.dateTimeFormat);
            } else {
                doneDateTime = task.doneDateTime.format(Task.dateFormat);
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
        const parsedDue = chrono.parse(editableTask.dueDateTime);
        if (parsedDue !== null && parsedDue.length > 0) {
            const result = parsedDue[0].start;
            if (result.isCertain('hour')) {
                dueDateTime = window.moment(result.date());
                hasDueTime = true;
            } else {
                dueDateTime = window.moment(result.date()).startOf('day');
            }
        }

        let doneDateTime: moment.Moment | null = null;
        let hasDoneTime: boolean = false; 
        const parsedDone = chrono.parse(editableTask.doneDateTime);
        if (parsedDone !== null && parsedDone.length > 0) {
            const result = parsedDone[0].start;
            if (result.isCertain('hour')) {
                doneDateTime = window.moment(result.date());
                hasDoneTime = true;
            } else {
                doneDateTime = window.moment(result.date()).startOf('day');
            }
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
            <code>📅 {@html parsedDueDateTime}</code>
        </div>
        <hr />
        <div class="tasks-modal-section">
            <label for="recurrence">Recurrence</label>
            <input bind:value={editableTask.recurrenceRule} id="description" type="text" placeholder="Try 'every 2 weeks on Thursday'." />
            <code>🔁 {@html parsedRRule }</code>
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
