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
        doneDate: string;
        doneTime: string;
    } = {
        description: '',
        status: Status.Todo,
        recurrenceRule: '',
        dueDateTime: '',
        doneDate: '',
        doneTime: '',
    };

    let parsedDueDate: string = '';
    let dueWithTime: boolean = false;
    let parsedRRule: string = '';
    let parsedDone: string = '';

    $: {
        if (!editableTask.dueDateTime) {
            parsedDueDate = '<i>no due date</>'
        } else {
            const parseResult = chrono.parse(editableTask.dueDateTime, new Date(), { forwardDate: true });
            if (parseResult && parseResult.length != 0) {
                const parsed = parseResult[0].start.date();
                if (parseResult[0].start.isCertain('hour')) {
                    parsedDueDate = window.moment(parsed).format('YYYY-MM-DD HH:mm');
                    dueWithTime = true;
                } else {
                    parsedDueDate = window.moment(parsed).format('YYYY-MM-DD');
                }
                
            } else {
                parsedDueDate = '<i>invalid due date</i>'
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
        if (!editableTask.doneDate) {
            parsedDone = '<i>no done date</i>'
        } else {
            const parsedDate = chrono.parseDate(editableTask.doneDate);
            if (parsedDate !== null) {
                parsedDone = window.moment(parsedDate).format('YYYY-MM-DD');
                if (editableTask.doneTime) {
                    const parsedTime = chrono.parseDate(editableTask.doneTime);
                    if (parsedTime !== null) {
                        parsedDone += " " + window.moment(parsedTime).format('HH:mm');
                    } else {
                        parsedDone = '<i>invalid done time</i>'
                    }
                }
            } else {
                parsedDone = '<i>invalid done date</i>'
            }
        }
    }

    onMount(() => {
        const { globalFilter } = getSettings();
        const description = task.description.replace(globalFilter, '').replace('  ', ' ').trim();
        let dueDateTime = '';
        if (task.dueDate) {
            dueDateTime += task.dueDate.format('YYYY-MM-DD');
            if (task.dueTime) {
                dueDateTime += " " + task.dueTime.format('HH:mm');
            }
        }
        editableTask = {
            description,
            status: task.status,
            recurrenceRule: task.recurrenceRule ? task.recurrenceRule.toText() : '',
            dueDateTime,
            doneDate: task.doneDate ? task.doneDate.format('YYYY-MM-DD') : '',
            doneTime: task.doneTime ? task.doneTime.format('HH:mm') : '',
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

        let dueDate: moment.Moment | null = null;
        const parsedDueDate = chrono.parseDate(editableTask.dueDateTime, new Date(), { forwardDate: true });
        if (parsedDueDate !== null) {
            dueDate = window.moment(parsedDueDate);
        }
        let dueTime: moment.Moment | null = null;
        if (dueWithTime) {
            dueTime = window.moment(parsedDueDate);
        }

        const updatedTask = new Task({
            ...task,
            description,
            status: editableTask.status,
            recurrenceRule,
            dueDate,
            dueTime,
            doneDate: window.moment(editableTask.doneDate, 'YYYY-MM-DD').isValid() ? window.moment(editableTask.doneDate, 'YYYY-MM-DD') : null,
            doneTime: window.moment(editableTask.doneTime, 'HH:mm').isValid() ? window.moment(editableTask.doneTime, 'HH:mm') : null,
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
            <input bind:value={editableTask.dueDateTime} id="due" type="text" placeholder="Try 'Monday' or 'tomorrow'." />
            <code>📅 {@html parsedDueDate}</code>
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
                <code>{@html parsedDone}</code>
            </div>
        </div>
        <hr />
        <div class="tasks-modal-section" />
        <div class="tasks-modal-section">
            <button type="submit" class="mod-cta">Apply</button>
        </div>
    </form>
</div>
