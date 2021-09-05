export interface Settings {
    globalFilter: string;
    removeGlobalFilter: boolean;
    doneTime: boolean;
    dateFormats: string[];
    timeFormat: string;
    dateTimeFormats: string[];
    dueDateSignifiers: string[];
    doneDateSignifiers: string[];
    recurrenceSignifiers: string[];
}

export const defaultSettings: Settings = {
    globalFilter: '',
    removeGlobalFilter: false,
    doneTime: false,
    dateFormats: ['YYYY-MM-DD', '\\[\\[YYYY-MM-DD\\]\\]'],
    timeFormat: 'HH:mm',
    dateTimeFormats: ['YYYY-MM-DD HH:mm', '\\[\\[YYYY-MM-DD\\]\\] HH:mm'],
    dueDateSignifiers: ['🗓', '📅', '📆'],
    doneDateSignifiers: ['✅'],
    recurrenceSignifiers: ['🔁'],
};

let settings: Settings = { ...defaultSettings };

export const getSettings = (): Settings => {
    return { ...settings };
};

export const updateSettings = (newSettings: Partial<Settings>): Settings => {
    settings = { ...settings, ...newSettings };

    return getSettings();
};

export const splitInputArray = (input: string): string[] => {
    return input.split('&&').map((format: string) => format.trim());
};

export const joinInputArray = (input: string[]): string => {
    return input.join(' && ');
};

// source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
export const escapeRegExp = (input: string): string => {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
