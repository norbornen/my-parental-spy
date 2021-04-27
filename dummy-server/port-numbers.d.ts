declare module 'port-numbers' {
    export interface Service {
        name: string;
        description?: string;
    }

    export interface Port {
        port: number;
        protocol: string;
        description?: string;
    }

    export const getService: (port: number, protocol?: string) => Service | null;
    export const getPort: (service: string, protocol?: string) => Port | null;
}
