import React, { useState } from "react";
import { Table } from "reactstrap";
import styled from "styled-components";
import { ContextMenuItem, useContextMenu } from "components";

export type MetaTableCell = string | number | React.ReactElement | Date | null;
export type MetaTableCells = { [key: string]: MetaTableCell };
export type MetaTableRows = { [key: string]: MetaTableCells };
export type MetaTableColumns = MetaTableCells;

export type MetaTableProps = {
    columns: MetaTableColumns;
    rows: MetaTableRows;
    selected?: Set<string>;
    onCellClick?: (rkey: string, ckey: string) => void;
    onCellContextMenu?: (rkey: string, ckey: string) => ContextMenuItem[];
    onColumnReorder?: (moved: string, before: string) => void;
    onDragStart?: (
        e: React.DragEvent<HTMLTableDataCellElement>,
        rkey: string,
        ckey: string
    ) => void;
    onDragEnd?: (e: React.DragEvent<HTMLTableDataCellElement>) => void;
    loading?: boolean;
    droppable?: boolean;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    showColumns?: boolean;
    showRows?: boolean;
    emptyResults?: React.ReactNode;
};

const Row = styled.tr<{ $selected?: boolean }>`
    background-color: ${(props) =>
        props.$selected ? props.theme.colors.info : "inherit"};
    color: ${(props) => props.theme.colors.defaultForeground};
    border-top: ${(props) =>
        props.$selected ? "3px solid !important" : "inherit"};
    border-bottom: ${(props) =>
        props.$selected ? "3px solid !important" : "inherit"};
    border-color: ${(props) =>
        props.$selected
            ? props.theme.colors.primary + " !important"
            : "inherit"};

    &:hover {
        background-color: ${(props) =>
            props.$selected
                ? props.theme.colors.primary
                : props.theme.colors.tableRowHover};
    }
`;

type HeaderCellProps = {
    $greyed: boolean;
    $draggedOver: boolean;
};

const HeaderCell = styled.th<HeaderCellProps>`
    background-color: ${(props) =>
        props.$greyed
            ? props.theme.colors.defaultGreyedOut
            : props.theme.colors.defaultForeground};
    color: ${(props) => props.theme.colors.defaultBackground};
    border-bottom: 2px solid;
    ${(props) =>
        props.$draggedOver &&
        "border-left: 5px double darkslategray !important;"}
`;

const ColumnTransferType = "metatable/column";
type ColumnDragEvent = React.DragEvent<HTMLTableHeaderCellElement>;

export const MetaTable = ({
    columns,
    rows,
    selected = new Set(),
    onCellClick,
    onCellContextMenu,
    onColumnReorder,
    onDragStart,
    onDragEnd,
    loading = false,
    droppable = false,
    onDragOver,
    onDrop,
    showColumns = true,
    showRows = true,
    emptyResults = "No results to display",
}: MetaTableProps) => {
    const [dragHeader, setDragHeader] = useState<string | null>(null);
    const [draggedOverHeader, setDraggedOverHeader] = useState<string | null>(
        null
    );
    const { show } = useContextMenu();

    const onColumnDragStart = (event: ColumnDragEvent, key: string) => {
        setTimeout(() => setDragHeader(key), 1);
        if (event.dataTransfer)
            event.dataTransfer.setData(ColumnTransferType, key);
    };

    const onColumnDragEnd = () => {
        setDragHeader(null);
        setDraggedOverHeader(null);
    };

    const onColumnDragOver = (event: ColumnDragEvent, key: string) => {
        event.preventDefault();
        event.stopPropagation();
        if (!dragHeader) return;
        setDraggedOverHeader(key);
    };

    const onColumnDrop = (
        event: React.DragEvent<HTMLTableHeaderCellElement>,
        key: string
    ) => {
        const moved = event.dataTransfer.getData(ColumnTransferType);
        moved && onColumnReorder && onColumnReorder(moved, key);
    };

    const headerIsDraggable = onColumnReorder !== undefined;

    const heads = Object.keys(columns).map((key) =>
        headerIsDraggable ? (
            <HeaderCell
                key={key}
                className="droppable"
                draggable
                onDragStart={(event) => onColumnDragStart(event, key)}
                onDragEnd={() => onColumnDragEnd()}
                onDragOver={(event) => onColumnDragOver(event, key)}
                onDrop={(event) => onColumnDrop(event, key)}
                $greyed={dragHeader === key}
                $draggedOver={draggedOverHeader === key}
            >
                {columns[key]}
            </HeaderCell>
        ) : (
            <HeaderCell key={key} $greyed={false} $draggedOver={false}>
                {columns[key]}
            </HeaderCell>
        )
    );

    const draggable: boolean = onDragStart !== undefined;

    const tableRows = Object.keys(rows).map((rowKey) => {
        const cells = Object.keys(columns).map((columnKey) => (
            <td
                key={columnKey}
                onClick={
                    onCellClick
                        ? () => onCellClick(rowKey, columnKey)
                        : undefined
                }
                onContextMenu={
                    onCellContextMenu
                        ? (e) => {
                              const items = onCellContextMenu(
                                  rowKey,
                                  columnKey
                              );
                              show(e, items);
                          }
                        : undefined
                }
                draggable={draggable}
                onDragStart={
                    onDragStart
                        ? (e) => onDragStart(e, rowKey, columnKey)
                        : undefined
                }
                onDragEnd={onDragEnd}
            >
                {rows[rowKey][columnKey]}
            </td>
        ));

        return (
            <Row key={rowKey} $selected={selected.has(rowKey)}>
                {cells}
            </Row>
        );
    });

    const noRows = loading ? "Loading..." : emptyResults;

    const renderRows =
        !loading && tableRows.length ? (
            tableRows
        ) : (
            <Row>
                <td align="center" colSpan={Object.keys(columns).length}>
                    <i>{noRows}</i>
                </td>
            </Row>
        );

    return (
        <Table
            className={"m-0" + (droppable ? " droppable" : "")}
            size="sm"
            bordered
            responsive
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {showColumns && (
                <thead>
                    <tr>{heads}</tr>
                </thead>
            )}
            {showRows && <tbody>{renderRows}</tbody>}
        </Table>
    );
};
