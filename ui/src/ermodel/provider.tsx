import React, { useState, useEffect, useContext } from "react";
import Client from "./client";
import { useAuth0 } from "utils";
import { Model, Resolver } from "perrydl";
import { models_url, dupe_url } from "auth_config.json";
import { DupeAPI } from "./dupeAPI";

export type ContextProps = {
    model?: Model;
    resolver?: Resolver;
};

type ProviderProps = {
    children: React.ReactElement;
};

type FetchState = {
    loading: boolean;
    done: boolean;
};

const emptyFetchState: FetchState = {
    loading: true,
    done: false,
};

export const EntityRelationContext = React.createContext<ContextProps | null>(
    null
);
export const useEntityRelation = () => useContext(EntityRelationContext)!;

export const EntityRelationProvider = ({ children }: ProviderProps) => {
    const { apiToken } = useAuth0();
    const [model, setModel] = useState<Model>();
    const [resolver, setResolver] = useState<Resolver>();
    const [erClient, setErClient] = useState<Client | null>(null);
    const [fetchState, setFetchState] = useState<FetchState>(emptyFetchState);

    useEffect(() => {
        if (apiToken && !erClient) {
            const erFromHook = new Client(models_url, apiToken);
            setErClient(erFromHook);
            setFetchState({ loading: false, done: false });
        }

        if (erClient && !fetchState.done && !fetchState.loading) {
            setFetchState({ loading: true, done: false });
            erClient
                .getModel()
                .then((inner) => {
                    const newModel = new Model(inner);
                    setModel(newModel);
                    const resolver = new Resolver(
                        newModel,
                        dupe_url,
                        apiToken!
                    );
                    setResolver(resolver);
                    DupeAPI.setInner(resolver);
                })
                .catch((err) => console.error("failed to obtain model:", err))
                .then(() => setFetchState({ loading: false, done: true }));
        }
    }, [apiToken, fetchState, erClient]);

    return (
        <EntityRelationContext.Provider
            value={{
                model,
                resolver,
            }}
        >
            {children}
        </EntityRelationContext.Provider>
    );
};
