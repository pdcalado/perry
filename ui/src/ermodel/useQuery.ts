import { useState, useEffect } from "react";
import {
    tree,
    QueryParams,
    QueryResponse,
    Resolver,
} from "perrydl";

export type Props = {
    resolver: Resolver;
    queryParams: tree.Node<QueryParams>;
};

export const useQuery = ({ resolver, queryParams }: Props) => {
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<QueryResponse | null>(null);

    const baseQuery = {
        page: 1,
        limit: 5,
        params: queryParams,
    };

    const doQuery = (input: string) => {
        setLoading(true);
        const options = {
            ...baseQuery,
            textSearch: input,
        };
        resolver
            ?.requestDataObjects(options)
            .then((response) => {
                setLoading(false);
                setResponse(response);
            })
            .catch((err) => console.error("failed to get results:", err));
    };

    useEffect(() => {
        setLoading(false);
    }, [queryParams]);

    return {
        doQuery,
        loading,
        response,
    };
};
