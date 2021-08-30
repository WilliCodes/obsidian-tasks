import { Query } from '../src/Query';
import { Status, Task } from '../src/Task';
import { fromLine } from './Sort.test'

describe('Query', () => {
    describe('filtering', () => {
        it('filters paths case insensitive', () => {
            // Arrange
            const tasks = [
                new Task({
                    status: Status.Todo,
                    description: 'description',
                    path: 'Ab/C D',
                    indentation: '',
                    sectionStart: 0,
                    sectionIndex: 0,
                    originalStatusCharacter: ' ',
                    precedingHeader: null,
                    dueDateTime: null,
                    hasDueTime: false,
                    doneDateTime: null,
                    hasDoneTime: false,
                    recurrenceRule: null,
                    blockLink: '',
                }),
                new Task({
                    status: Status.Todo,
                    description: 'description',
                    path: 'FF/C D',
                    indentation: '',
                    sectionStart: 0,
                    sectionIndex: 0,
                    originalStatusCharacter: ' ',
                    precedingHeader: null,
                    dueDateTime: null,
                    hasDueTime: false,
                    doneDateTime: null,
                    hasDoneTime: false,
                    recurrenceRule: null,
                    blockLink: '',
                }),
            ];
            const input = 'path includes ab/c d';
            const query = new Query({ source: input });

            // Act
            let filteredTasks = [...tasks];
            query.filters.forEach((filter) => {
                filteredTasks = filteredTasks.filter(filter);
            });

            // Assert
            expect(filteredTasks.length).toEqual(1);
            expect(filteredTasks[0]).toEqual(tasks[0]);
        });
    });

    it('filters due before date', () => {
        // Arrange
        const a = fromLine('- [ ] a 🗓 2000-02-01');
        const b = fromLine('- [ ] b 🗓 2000-02-01 23:30');
        const c = fromLine('- [ ] c 🗓 2000-02-02');
        const d = fromLine('- [ ] d 🗓 2000-02-02 00:30');
        const e = fromLine('- [ ] e 🗓 2000-02-03');
        const tasks = [a, b, c, d, e];
        const input = 'due before 2000-02-02';
        const query = new Query({ source: input });

        // Act
        let filteredTasks = [...tasks];
        query.filters.forEach((filter) => {
            filteredTasks = filteredTasks.filter(filter);
        });

        // Assert
        expect(filteredTasks.length).toEqual(2);
        expect(filteredTasks[0]).toEqual(a);
        expect(filteredTasks[1]).toEqual(b);
    });

    it('filters due after date', () => {
        // Arrange
        const a = fromLine('- [ ] a 🗓 2000-02-01');
        const b = fromLine('- [ ] b 🗓 2000-02-02');
        const c = fromLine('- [ ] c 🗓 2000-02-02 02:02');
        const d = fromLine('- [ ] d 🗓 2000-02-03');
        const tasks = [a, b, c, d];
        const input = 'due after 2000-02-02';
        const query = new Query({ source: input });

        // Act
        let filteredTasks = [...tasks];
        query.filters.forEach((filter) => {
            filteredTasks = filteredTasks.filter(filter);
        });

        // Assert
        expect(filteredTasks.length).toEqual(1);
        expect(filteredTasks[0]).toEqual(d);
    });

    it('filters due on date', () => {
        // Arrange
        const a = fromLine('- [ ] a 🗓 2000-02-01 01:01');
        const b = fromLine('- [ ] b 🗓 2000-02-02');
        const c = fromLine('- [ ] c 🗓 2000-02-02 02:02');
        const d = fromLine('- [ ] d 🗓 2000-02-03');
        const tasks = [a, b, c, d];
        const input = 'due 2000-02-02';
        const query = new Query({ source: input });

        // Act
        let filteredTasks = [...tasks];
        query.filters.forEach((filter) => {
            filteredTasks = filteredTasks.filter(filter);
        });

        // Assert
        expect(filteredTasks.length).toEqual(2);
        expect(filteredTasks[0]).toEqual(b);
        expect(filteredTasks[1]).toEqual(c);
    });

    it('filters due before datetime', () => {
        // Arrange
        const a = fromLine('- [ ] a 🗓 2000-02-01');
        const b = fromLine('- [ ] b 🗓 2000-02-02 01:01');
        const c = fromLine('- [ ] c 🗓 2000-02-02 03:03');
        const d = fromLine('- [ ] d 🗓 2000-02-03');
        const tasks = [a, b, c, d];
        const input = 'due before 2000-02-02 02:02';
        const query = new Query({ source: input });

        // Act
        let filteredTasks = [...tasks];
        query.filters.forEach((filter) => {
            filteredTasks = filteredTasks.filter(filter);
        });

        // Assert
        expect(filteredTasks.length).toEqual(2);
        expect(filteredTasks[0]).toEqual(a);
        expect(filteredTasks[1]).toEqual(b);
    });

    it('filters due after datetime', () => {
        // Arrange
        const a = fromLine('- [ ] a 🗓 2000-02-01');
        const b = fromLine('- [ ] b 🗓 2000-02-02');
        const c = fromLine('- [ ] c 🗓 2000-02-02 01:01');
        const d = fromLine('- [ ] d 🗓 2000-02-02 03:03');
        const e = fromLine('- [ ] e 🗓 2000-02-03');
        const tasks = [a, b, c, d, e];
        const input = 'due after 2000-02-02 02:02';
        const query = new Query({ source: input });

        // Act
        let filteredTasks = [...tasks];
        query.filters.forEach((filter) => {
            filteredTasks = filteredTasks.filter(filter);
        });

        // Assert
        expect(filteredTasks.length).toEqual(2);
        expect(filteredTasks[0]).toEqual(d);
        expect(filteredTasks[1]).toEqual(e);
    });

    describe('sorting instructions', () => {
        const cases: { input: string; output: string[] }[] = [
            {
                input: 'sort by status',
                output: ['status'],
            },
            {
                input: 'sort by status\nsort by due',
                output: ['status', 'due'],
            },
        ];
        test.each(cases)('sorting as %p', ({ input, output }) => {
            const query = new Query({ source: input });

            expect(query.sorting).toEqual(output);
        });
    });
});
