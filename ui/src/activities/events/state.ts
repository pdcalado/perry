import { atom } from "recoil";
import { RawEvent } from "eventBroker";

export const lastMutations = atom<RawEvent[]>({
    key: "lastMutations",
    default: [],
})