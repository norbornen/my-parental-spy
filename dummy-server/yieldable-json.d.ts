declare module 'yieldable-json' {
    export const parseAsync: <T extends any>(data: string | Buffer, cb: (err: Error | undefined | null, data: T | undefined | null) => void) => void;
    export const stringifyAsync: (data: any, cb: (err: Error | undefined | null, data: string | undefined | null) => void) => void;
}
