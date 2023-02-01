import React, { useState } from "react";
import {
    EntitySpec,
    Attribute,
    Resolver,
    tree,
    QueryParams,
    TypeOfAttribute,
    DataObject,
} from "perrydl";
import { useQuery } from "ermodel";
import {
    MetaTableRows,
    MetaTableCells,
    SearchInput,
    MetaTable,
} from "components";
import { columnsFromAttributes } from "./utils";
import styled from "styled-components";

const createNewNode = (meta: tree.Meta): QueryParams => {
    if (meta.kind === tree.Kind.Attribute)
        return (meta.reference as Attribute).type === TypeOfAttribute.String
            ? { byText: true }
            : {};
    return {};
};

const WrapTable = styled.div`
    cursor: pointer;
`;

export const FuzzyPicker = ({
    entity,
    attributes,
    resolver,
    onClick,
    placeholder,
}: {
    entity: EntitySpec;
    attributes: Attribute[];
    resolver: Resolver;
    onClick: (object: DataObject) => void;
    placeholder?: string;
}) => {
    const queryParams: tree.Node<QueryParams> = tree.Builder.entityWithAttributes(
        entity,
        createNewNode,
        attributes
    );

    // useQuery hook for performing database queries.
    const { doQuery, loading, response } = useQuery({ resolver, queryParams });
    // Text input for searching
    const [textInput, setTextInput] = useState<string>("");
    // Show table results or not
    const [showTable, setShowTable] = useState<boolean>(false);

    const onChange = (text: string) => {
        doQuery(text);
        setTextInput(text);
        if (!showTable) setShowTable(true);
    };

    const columns = columnsFromAttributes(attributes);

    const objects: DataObject[] | null =
        response && response.getData()[entity.getPlural()];
    const rows: MetaTableRows = objects
        ? objects.reduce((table, object) => {
              table[object.id] = object as MetaTableCells;
              return table;
          }, {} as MetaTableRows)
        : ({} as MetaTableRows);

    const onCellClick = (rkey: string) => {
        setShowTable(false);
        onClick(rows[rkey] as DataObject);
    };

    const onFocus = () => {
        doQuery(textInput);
        setShowTable(true);
    };

    const onInputClick = () => {
        if (!showTable) setShowTable(true);
    };

    return (
        <div tabIndex={0} onBlur={() => setShowTable(false)}>
            <SearchInput
                icon={null}
                text={textInput}
                onChange={(event) => onChange(event.target.value)}
                onFocus={onFocus}
                loading={loading}
                placeholder={placeholder}
                onClick={onInputClick}
            />
            {showTable && (
                <WrapTable onMouseDown={(e) => e.preventDefault()}>
                    <MetaTable
                        columns={columns}
                        rows={rows}
                        loading={loading}
                        onCellClick={onCellClick}
                    />
                </WrapTable>
            )}
        </div>
    );
};
