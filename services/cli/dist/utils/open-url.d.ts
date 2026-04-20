interface OpenWebPageOptions {
    dataDir?: string;
    route?: string;
}
interface OpenWebPageResult {
    success: boolean;
    url: string;
    error?: string;
}
export declare function resolveWebUiBaseUrl(dataDir?: string): Promise<string>;
export declare function openWebPage(options?: OpenWebPageOptions): Promise<OpenWebPageResult>;
export declare function buildWebUiUrl(baseUrl: string, route?: string): string;
export {};
//# sourceMappingURL=open-url.d.ts.map