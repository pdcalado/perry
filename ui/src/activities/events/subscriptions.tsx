import { useRecoilCallback } from "recoil";
import { SubscriptionProps, ParsedEvent } from "eventBroker";
import { useEffect } from "react";
import { lastMutations } from "./state";

export const mutationsTopic = "sampleperry.dupe.fct.mutations.0";

export const SubscribeMutations = ({ client }: SubscriptionProps) => {
    const consumer = useRecoilCallback(
        ({ set }) => {
            return (event: ParsedEvent<object>) => {
                console.log("consuming", event);
                set(lastMutations, (prev) => {
                    return [...prev, event].slice(-10, prev.length+1);
                });
            };
        },
        [lastMutations]
    );

    useEffect(() => client.consumeJsonEvent(mutationsTopic, consumer), [
        client,
        consumer,
    ]);

    return null;
};
