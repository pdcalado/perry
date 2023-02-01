export type Options = {
    page?: number;
    limit?: number;
    q?: string;
} & { [key: string]: string | string[] };

const OptionKeys = new Map([
    ["page", "_page"],
    ["limit", "_limit"],
    ["q", "q"],
]);

const encodeOptions = (options: Options) => {
    let params = new URLSearchParams();

    Object.keys(options).forEach((key) => {
        let queryKey = OptionKeys.get(key) ? OptionKeys.get(key) : key;
        if (!Array.isArray(options[key])) {
            params.append(queryKey!, options[key].toString());
        } else {
            (options[key] as string[]).forEach((value) =>
                params.append(queryKey!, value.toString())
            );
        }
    });

    return params;
};

class JsonServer {
    baseUrl: string;
    token: string;

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    setTokenInHeaders = (headers: Headers) => {
        headers.set("Authorization", "Bearer " + this.token);
    };

    get = async (
        path: string,
        options?: Options,
        extraHeaders?: Headers
    ): Promise<object[] | object> => {
        let url = new URL(this.baseUrl + path);
        if (options) {
            let params = encodeOptions(options);
            url.search = params.toString();
        }

        let headers: Headers = extraHeaders ? extraHeaders : new Headers();
        this.setTokenInHeaders(headers);

        const result = await fetch(url.toString(), {
            headers,
        }).then((response) => response.json());
        return result;
    };
}

export default JsonServer;
