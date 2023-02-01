import React from "react";
import { TabsAPI } from "utils";
import { TFunction } from "i18next";
import { TreeStructureSideOption, ContextMenuItem } from "components";
import {
    createSpecificObjectFromUrn,
    editSpecificObjectFromUrn,
    deleteSpecificObjectFromUrn,
} from "./factoryTabs";
import { Edit, TrashAlt } from "icons";
import { DataObject } from "perrydl";
const EditIcon = Edit;
const DeleteIcon = TrashAlt;

const titleForCreateNew = (t: TFunction, name: string) =>
    t("createNew", { name: name });

export const sideOptionCreateNew = (
    t: TFunction,
    tabsAPI: TabsAPI,
    title: string,
    urn: string,
    icon: React.ReactNode,
    initial?: DataObject
): TreeStructureSideOption => {
    const label = titleForCreateNew(t, title);
    return {
        tooltip: label,
        icon,
        onClick: () =>
            tabsAPI.createNew(createSpecificObjectFromUrn(urn, label, initial)),
    };
};

export const menuOptionCreateNew = (
    t: TFunction,
    tabsAPI: TabsAPI,
    title: string,
    urn: string,
    initial?: DataObject
): ContextMenuItem => {
    const label = titleForCreateNew(t, title);
    return {
        label: label,
        command: () =>
            tabsAPI.createNew(createSpecificObjectFromUrn(urn, label, initial)),
    };
};

const titleForClone = (t: TFunction, name: string) =>
    t("clone", { name: name });

export const menuOptionClone = (
    t: TFunction,
    tabsAPI: TabsAPI,
    title: string,
    urn: string,
    object: DataObject
): ContextMenuItem => {
    const label = titleForClone(t, title);
    return {
        label: label,
        command: () =>
            tabsAPI.createNew(createSpecificObjectFromUrn(urn, label, object)),
    };
};

const titleForEdit = (t: TFunction, name: string) => t("edit", { name: name });

export const sideOptionEdit = (
    t: TFunction,
    tabsAPI: TabsAPI,
    title: string,
    urn: string,
    id: number
): TreeStructureSideOption => {
    const label = titleForEdit(t, title);
    return {
        tooltip: label,
        icon: <EditIcon />,
        onClick: () =>
            tabsAPI.createNew(editSpecificObjectFromUrn(urn, label, id)),
    };
};

export const menuOptionEdit = (
    t: TFunction,
    tabsAPI: TabsAPI,
    title: string,
    urn: string,
    id: number
): ContextMenuItem => {
    const label = titleForEdit(t, title);
    return {
        label: label,
        command: () =>
            tabsAPI.createNew(editSpecificObjectFromUrn(urn, label, id)),
    };
};

const titleForDelete = (t: TFunction, name: string) =>
    t("delete", { name: name });

export const sideOptionDelete = (
    t: TFunction,
    tabsAPI: TabsAPI,
    title: string,
    urn: string,
    id: number
): TreeStructureSideOption => {
    const label = titleForDelete(t, title);
    return {
        tooltip: label,
        icon: <DeleteIcon />,
        onClick: () =>
            tabsAPI.openModal(deleteSpecificObjectFromUrn(urn, label, id)),
    };
};

export const menuOptionDelete = (
    t: TFunction,
    tabsAPI: TabsAPI,
    title: string,
    urn: string,
    id: number
): ContextMenuItem => {
    const label = titleForDelete(t, title);
    return {
        label: label,
        command: () =>
            tabsAPI.openModal(deleteSpecificObjectFromUrn(urn, label, id)),
    };
};
