import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "utils";
import { event_broker_url } from "auth_config.json";
import { EventBrokerClient } from "./client";
import { subscriptions } from "_subscriptions_config";

/**
 * Subscription component props to be loaded when event broker starts.
 */
export type SubscriptionProps = {
    client: EventBrokerClient;
};

export type ContextProps = {
    client?: EventBrokerClient;
};

type ProviderProps = {
    children: React.ReactElement;
};

export const EventBrokerContext = React.createContext<ContextProps | null>(
    null
);
export const useEventBroker = () => useContext(EventBrokerContext)!;

export const EventBrokerProvider = ({ children }: ProviderProps) => {
    const { apiToken } = useAuth0();
    const [client, setClient] = useState<EventBrokerClient>();

    useEffect(() => {
        if (apiToken && !client) {
            const clientFromHook = new EventBrokerClient(
                event_broker_url,
                apiToken
            );
            setClient(clientFromHook);
        }
    }, [apiToken, client, setClient]);

    const subscriptionComponents =
        client &&
        subscriptions.map((Comp, index) => (
            <Comp key={index} client={client} />
        ));

    return (
        <EventBrokerContext.Provider
            value={{
                client,
            }}
        >
            <React.Fragment>
                {subscriptionComponents}
                {children}
            </React.Fragment>
        </EventBrokerContext.Provider>
    );
};
