import {
    ListItemCache,
    MetadataCache,
    TFile,
    Vault,
    getAllTags,
} from 'obsidian';

import { getSettings } from './Settings';
import type { Task } from './Task';

let metadataCache: MetadataCache | undefined;
let vault: Vault | undefined;

export const initializeFile = ({
    metadataCache: newMetadataCache,
    vault: newVault,
}: {
    metadataCache: MetadataCache;
    vault: Vault;
}) => {
    metadataCache = newMetadataCache;
    vault = newVault;
};

/**
 * Replaces the original task with one or more new tassk.
 *
 * If you pass more than one replacement task, all subsequent tasks in the same
 * section must be re-rendered, as their section indexes change. Assuming that
 * this is done faster than user interaction in practice.
 */
export const replaceTaskWithTasks = async ({
    originalTask,
    newTasks,
}: {
    originalTask: Task;
    newTasks: Task | Task[];
}): Promise<void> => {
    if (vault === undefined || metadataCache === undefined) {
        console.error('Tasks: cannot use File before initializing it.');
        return;
    }

    if (!Array.isArray(newTasks)) {
        newTasks = [newTasks];
    }

    tryRepetitive({
        originalTask,
        newTasks,
        vault,
        metadataCache,
        previousTries: 0,
    });
};

/**
 * This is a workaround to re-try when the returned file cache is `undefined`.
 * Retrying after a while may return a valid file cache.
 * Reported in https://github.com/schemar/obsidian-tasks/issues/87
 */
const tryRepetitive = async ({
    originalTask,
    newTasks,
    vault,
    metadataCache,
    previousTries,
}: {
    originalTask: Task;
    newTasks: Task[];
    vault: Vault;
    metadataCache: MetadataCache;
    previousTries: number;
}): Promise<void> => {
    const retry = () => {
        if (previousTries > 10) {
            console.error(
                'Tasks: Too many retries. File update not possible ...',
            );
            return;
        }

        const timeout = Math.min(Math.pow(10, previousTries), 100); // 1, 10, 100, 100, 100, ...
        setTimeout(() => {
            tryRepetitive({
                originalTask,
                newTasks,
                vault,
                metadataCache,
                previousTries: previousTries + 1,
            });
        }, timeout);
    };

    const file = vault.getAbstractFileByPath(originalTask.path);
    if (!(file instanceof TFile)) {
        console.warn(
            `Tasks: No file found for task ${originalTask.description}. Retrying ...`,
        );
        return retry();
    }

    if (file.extension !== 'md') {
        console.error(
            'Tasks: Only supporting files with the .md file extension.',
        );
        return;
    }

    const fileCache = metadataCache.getFileCache(file);
    if (fileCache == undefined || fileCache === null) {
        console.warn(
            `Tasks: No file cache found for file ${file.path}. Retrying ...`,
        );
        return retry();
    }

    const listItemsCache = fileCache.listItems;
    if (listItemsCache === undefined || listItemsCache.length === 0) {
        console.warn(
            `Tasks: No list items found in file cache of ${file.path}. Retrying ...`,
        );
        return retry();
    }

    const fileContent = await vault.read(file);
    const fileLines = fileContent.split('\n');

    const { globalFilter } = getSettings();
    let listItem: ListItemCache | undefined;
    let sectionIndex = 0;
    for (const listItemCache of listItemsCache) {
        if (listItemCache.position.start.line < originalTask.sectionStart) {
            continue;
        }

        if (listItemCache.task === undefined) {
            continue;
        }

        const line = fileLines[listItemCache.position.start.line];

        if (line.includes(globalFilter)) {
            if (sectionIndex === originalTask.sectionIndex) {
                listItem = listItemCache;
                break;
            }

            sectionIndex++;
        }
    }
    if (listItem === undefined) {
        console.error('Tasks: could not find task to toggle in the file.');
        return;
    }

    const updatedFileLines = [
        ...fileLines.slice(0, listItem.position.start.line),
        ...newTasks.map((task: Task) => task.toFileLineString()),
        ...fileLines.slice(listItem.position.start.line + 1), // Only supports single-line tasks.
    ];

    await vault.modify(file, updatedFileLines.join('\n'));
};

/**
 * Reads all tags within in the Task's file.
 */
export const readTagsInFile = ({ task }: { task: Task }): string[] => {
    if (vault === undefined || metadataCache === undefined) {
        console.error('Tasks: cannot use File before initializing it.');
        return [];
    }

    const file = vault.getAbstractFileByPath(task.path);
    if (!(file instanceof TFile)) {
        console.warn(`Tasks: No file found for task ${task.description}.`);
        return [];
    }

    if (file.extension !== 'md') {
        console.error(
            'Tasks: Only supporting files with the .md file extension.',
        );
        return [];
    }

    const fileCache = metadataCache.getFileCache(file);
    if (fileCache == undefined || fileCache === null) {
        console.warn(`Tasks: No file cache found for file ${file.path}.`);
        return [];
    }

    const tags = getAllTags(fileCache);
    if (!tags) {
        return [];
    } else {
        const expanded_tags = tags
            .map((tag: string) => expandSubtags({ tag: tag.toLowerCase() }))
            .reduce((acc, val) => acc.concat(val), []);
        return expanded_tags;
    }
};

/**
 * Tags with subtags (e.g. `#project/a`) should be split (into `#project` and `#project/a`).
 * This enables to include/exclude all subtags with a parent tag.
 */
const expandSubtags = ({ tag }: { tag: string }): string[] => {
    const all_tags = [tag];
    const chars = [...tag];
    chars.forEach((c, i) => {
        if (c === '/') {
            all_tags.push(chars.slice(0, i).join(''));
        }
    });
    return all_tags;
};
