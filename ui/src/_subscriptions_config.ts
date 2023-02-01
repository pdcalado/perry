import { SubscriptionProps } from "eventBroker";
import { SubscribeMutations } from "activities/events/subscriptions";

export const subscriptions: React.FC<SubscriptionProps>[] = [
    SubscribeMutations,
];
