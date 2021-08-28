import type { Task } from './Task';
import type { Query } from './Query';
import type moment from 'moment';

type Comparator = (a: Task, b: Task) => number;

export class Sort {
    public static by(query: Pick<Query, 'sorting'>, tasks: Task[]): Task[] {
        const priorities: Comparator[] = [
            this.compareByStatus,
            this.compareByDueDateTime,
            this.compareByPath,
        ];

        for (const sortProp of query.sorting.reverse()) {
            switch (sortProp) {
                case 'status':
                    priorities.unshift(this.compareByStatus);
                    break;
                case 'due':
                    priorities.unshift(this.compareByDueDateTime);
                    break;
                case 'done':
                    priorities.unshift(this.compareByDoneDateTime);
                    break;
                case 'path':
                    priorities.unshift(this.compareByPath);
                    break;
                case 'description':
                    priorities.unshift(this.compareByDescription);
                    break;
            }
        }

        return tasks.sort(this.makeCompositeComparator(priorities));
    }

    private static makeCompositeComparator(
        comparators: Comparator[],
    ): Comparator {
        return (a, b) => {
            for (const comparator of comparators) {
                const result = comparator(a, b);
                if (result !== 0) {
                    return result;
                }
            }
            return 0;
        };
    }

    private static compareByStatus(a: Task, b: Task): -1 | 0 | 1 {
        if (a.status < b.status) {
            return 1;
        } else if (a.status > b.status) {
            return -1;
        } else {
            return 0;
        }
    }

    private static compareByDueDateTime(a: Task, b: Task): -1 | 0 | 1 {
        const result = Sort.compareByMoment(a.dueDate, b.dueDate);
        if (result == 0) {
            return Sort.compareByMoment(a.dueTime, b.dueTime);
        } else {
            return result;
        }
    }

    private static compareByDoneDateTime(a: Task, b: Task): -1 | 0 | 1 {
        const result = Sort.compareByMoment(a.doneDate, b.doneDate);
        if (result == 0) {
            return Sort.compareByMoment(a.doneTime, b.doneTime);
        } else {
            return result;
        }
    }

    private static compareByMoment(
        a: moment.Moment | null,
        b: moment.Moment | null,
    ): -1 | 0 | 1 {
        if (a !== null && b === null) {
            return -1;
        } else if (a === null && b !== null) {
            return 1;
        } else if (a !== null && b !== null) {
            if (a.isAfter(b)) {
                return 1;
            } else if (a.isBefore(b)) {
                return -1;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }

    private static compareByPath(a: Task, b: Task): -1 | 0 | 1 {
        if (a.path < b.path) {
            return -1;
        } else if (a.path > b.path) {
            return 1;
        } else {
            return 0;
        }
    }

    private static compareByDescription(a: Task, b: Task) {
        return a.description.localeCompare(b.description);
    }
}
