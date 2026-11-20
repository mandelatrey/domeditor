type Config = {
    pageExtensions?: string[];
    [key: string]: unknown;
};
declare function withDomEditor<T extends Config>(config: T): T;

export { withDomEditor as default, withDomEditor };
