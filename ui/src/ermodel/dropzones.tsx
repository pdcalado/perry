import React, { useState } from "react";
import { Attribute, EntitySpec, DataObject } from "perrydl";
import {
    BasicButton,
    MetaTable,
    MetaTableCells,
    MetaTableProps,
    MetaTableRows,
} from "components";
import styled from "styled-components";
import { columnsFromAttributes } from "./utils";
import { TrashAlt, DropHere, Edit } from "icons";
import { useTranslation } from "react-i18next";
import { renderEntityAsTable, RenderAsTable } from "./render";
import { useTabs } from "utils";
import { editObjectInModal, createObjectInModal } from "./factoryTabs";
import { RelationFilter } from "forms";

const removeColumn = "_remove";
const removeIcon = <TrashAlt />;
const editColumn = "_edit";
const editIcon = <Edit />;

const rowFromItem = (item: DataObject, remove: (item: DataObject) => void) => ({
    ...(item as MetaTableCells),
    [removeColumn]: (
        <BasicButton variant="danger" onClick={() => remove(item)}>
            {removeIcon}
        </BasicButton>
    ),
});

const rowFromItemEdit = (
    item: DataObject,
    renderer: RenderAsTable,
    edit: (item: DataObject) => void,
    remove: (item: DataObject) => void
) => ({
    ...renderer.row(item),
    [editColumn]: (
        <BasicButton variant="info" onClick={() => edit(item)}>
            {editIcon}
        </BasicButton>
    ),
    [removeColumn]: (
        <BasicButton variant="danger" onClick={() => remove(item)}>
            {removeIcon}
        </BasicButton>
    ),
});

const Droppable: React.FC<MetaTableProps> = (props) => (
    <MetaTable
        loading={false}
        droppable={true}
        onDragOver={(e: any) => e.preventDefault()}
        showColumns={Object.keys(props.rows).length > 0}
        {...props}
    />
);

const Dashed = styled.div`
    border: dashed 1px;
    :focus {
        background-color: ${(props) => props.theme.colors.defaultForeground}33;
    }
`;

const Empty = (top: string, bottom: string) => (
    <Dashed>
        <p>{top}</p>
        <p>
            <DropHere size="3x" />
        </p>
        {bottom}
    </Dashed>
);

type DropProps = {
    entity: EntitySpec;
    attributes: Attribute[];
    emptyText?: React.ReactNode;
};

type UncontrolledMultiItemDropProps = DropProps & {
    onChange?: (items: DataObject[]) => void;
};

export const UncontrolledMultiItemDrop = ({
    entity,
    attributes,
    emptyText,
    onChange = () => {},
}: UncontrolledMultiItemDropProps) => {
    const [items, setItems] = useState<Map<number, DataObject>>(new Map());

    const change = (items: Map<number, DataObject>) => {
        setItems(items);
        onChange(Array.from(items.values()));
    };

    const onAdd = (added: DataObject[]) => {
        const after = new Map(items);
        for (const toAdd of added) {
            if (!after.has(toAdd.id)) after.set(toAdd.id, toAdd);
        }
        change(after);
    };

    const onRemove = (item: DataObject) => {
        if (items.has(item.id)) {
            const after = new Map(items);
            after.delete(item.id);
            change(after);
        }
    };

    return (
        <MultiItemDrop
            entity={entity}
            attributes={attributes}
            emptyText={emptyText}
            items={Array.from(items.values())}
            onAdd={onAdd}
            onRemove={onRemove}
        />
    );
};

type MultiItemDropProps = DropProps & {
    items: DataObject[];
    onAdd: (items: DataObject[]) => void;
    onRemove: (item: DataObject) => void;
};

export const MultiItemDrop = ({
    entity,
    attributes,
    emptyText,
    items = [],
    onAdd,
    onRemove,
}: MultiItemDropProps) => {
    const { t } = useTranslation();

    const empty =
        emptyText ||
        Empty(
            t("dragObjectsHere", { name: entity.getName() }),
            t("orSearchForThem")
        );

    const onDrop = (e: any) => {
        try {
            const payload = e.dataTransfer.getData("application/json");
            const dropped = JSON.parse(payload);
            if (dropped.length === 0) return;

            onAdd(dropped);
        } catch (e) {
            console.error("drop failed:", e);
        }
    };

    const columns = columnsFromAttributes(attributes);
    // Add column for removing items
    columns[removeColumn] = removeIcon;

    const rows = {} as MetaTableRows;
    for (const item of items) {
        rows[item.id] = rowFromItem(item, onRemove);
    }

    return (
        <Droppable
            columns={columns}
            rows={rows}
            onDrop={onDrop}
            emptyResults={empty}
        />
    );
};

type UncontrolledSingleItemDropProps = DropProps & {
    onChange?: (item: DataObject | null) => void;
};

type SingleItemDropProps = UncontrolledSingleItemDropProps & {
    item: DataObject | null;
};

export const UncontrolledSingleItemDrop = ({
    entity,
    attributes,
    emptyText,
    onChange = () => {},
}: UncontrolledSingleItemDropProps) => {
    const [item, setItem] = useState<DataObject | null>(null);

    const change = (item: DataObject | null) => {
        setItem(item);
        onChange(item);
    };

    return (
        <SingleItemDrop
            entity={entity}
            attributes={attributes}
            emptyText={emptyText}
            onChange={change}
            item={item}
        />
    );
};

export const SingleItemDrop = ({
    entity,
    attributes,
    emptyText,
    onChange = () => {},
    item = null,
}: SingleItemDropProps) => {
    const { t } = useTranslation();

    const empty =
        emptyText ||
        Empty(
            t("dragObjectHere", { name: entity.getName() }),
            t("orSearchForOne")
        );

    const onDrop = (e: any) => {
        try {
            const payload = e.dataTransfer.getData("application/json");
            const dropped = JSON.parse(payload);
            if (dropped.length === 0) return;
            if (dropped.length > 1)
                throw new Error("only one item can be dropped here");
            onChange(dropped[0]);
        } catch (e) {
            console.error("drop failed:", e);
        }
    };

    const removeItem = (_: DataObject) => onChange(null);

    const columns = columnsFromAttributes(attributes);
    // Add column for removing items
    columns[removeColumn] = removeIcon;

    const rows = {} as MetaTableRows;
    if (item) {
        rows[item.id] = rowFromItem(item, removeItem);
    }

    return (
        <Droppable
            columns={columns}
            rows={rows}
            onDrop={onDrop}
            emptyResults={empty}
        />
    );
};

type MultiItemEditProps = DropProps & {
    items: DataObject[];
    onAdd: (items: DataObject[]) => void;
    onRemove: (item: DataObject) => void;
    relationFilter: RelationFilter;
    forceUpdate: () => void;
};

export const MultiItemEdit = ({
    entity,
    attributes,
    emptyText,
    items = [],
    onAdd,
    onRemove,
    relationFilter,
    forceUpdate,
}: MultiItemEditProps) => {
    const { t } = useTranslation();
    const { tabsAPI } = useTabs();

    const empty =
        emptyText ||
        Empty(
            t("dragObjectsHere", { name: entity.getName() }),
            t("orSearchForThem")
        );

    const onDrop = (e: any) => {
        console.error("on drop not implemented");
    };

    // After edit, only copy changes in common attributes
    const onEdit = (prev: DataObject, item: DataObject) => {
        const result = { ...prev };
        for (let key of Object.keys(item).filter((key) =>
            entity.findAttributeById(key)
        )) {
            result[key] = item[key];
        }
        onAdd([result]);
    };

    const renderer = renderEntityAsTable(entity);

    const columns = renderer.columns(attributes);
    // Add column for editing items
    columns[editColumn] = editIcon;
    // Add column for removing items
    columns[removeColumn] = removeIcon;

    const rows = {} as MetaTableRows;
    items.forEach((item, index) => {
        const title = t("add", { name: entity.getName() });
        const blockFilter = relationFilter.clone();
        blockFilter.setBlockAll(true);
        const onClickEdit = item.id
            ? () => {
                  tabsAPI.openModal(
                      editObjectInModal(entity.getUrn(), title, item.id, {
                          relationFilter: blockFilter,
                          onDone: forceUpdate,
                      })
                  );
              }
            : () => {
                  tabsAPI.openModal(
                      createObjectInModal(entity.getUrn(), title, {
                          onCreate: (object) => onEdit(item, object),
                          relationFilter: blockFilter,
                          initial: item,
                          notify: false,
                      })
                  );
              };
        rows[index] = rowFromItemEdit(item, renderer, onClickEdit, onRemove);
    });

    return (
        <Droppable
            columns={columns}
            rows={rows}
            onDrop={onDrop}
            emptyResults={empty}
        />
    );
};
