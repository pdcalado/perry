import { atom } from "recoil";

export const showActivityBar = atom<boolean>({
    key: "dock.showActivityBar",
    default: true,
});

export const showSidebar = atom<boolean>({
    key: "dock.showSidebar",
    default: true,
});
