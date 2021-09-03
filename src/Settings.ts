export interface Settings {
    globalFilter: string;
    removeGlobalFilter: boolean;
    doneTime: boolean;
    dateFormats: string[];
    timeFormat: string;
    dateTimeFormats: string[];
    dueDateSignifier: string;
    doneDateSignifier: string;
}

const defaultSettings: Settings = {
    globalFilter: '',
    removeGlobalFilter: false,
    doneTime: false,
    dateFormats: ['YYYY-MM-DD'],
    timeFormat: 'HH:mm',
    dateTimeFormats: ['YYYY-MM-DD HH:mm'],
    dueDateSignifier: '🗓',
    doneDateSignifier: '✅',
};

let settings: Settings = { ...defaultSettings };

export const getSettings = (): Settings => {
    return { ...settings };
};

export const updateSettings = (newSettings: Partial<Settings>): Settings => {
    settings = { ...settings, ...newSettings };

    return getSettings();
};

export const splitFormatArray = (input: string): string[] => {
    return input.split('&&').map((format: string) => format.trim());
};

export const joinFormatArray = (input: string[]): string => {
    return input.join(' && ');
};

// source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
export const escapeRegExp = (input: string): string => {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
