import React, { useEffect, useCallback } from "react";
import {
    EntitySpec,
    Model,
    Resolver,
    tree,
    Attribute,
    muri,
} from "perrydl";
import {
    MetaTableColumns,
    MetaTableRows,
    MetaTable,
    toastSuccess,
    toastError,
} from "components";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import {
    ErrorsByAttribute,
    FormTitle,
    FilePicker,
    SeparatorPicker,
    NumberPicker,
    ColumnPicker,
    FormError,
    ListErrors,
    LoadingButton,
} from "./common";
import styled from "styled-components";
import { FormGroup, Label, FormText } from "reactstrap";
import { TFunction } from "i18next";
import { bulk_upload_url } from "auth_config.json";
import { useAuth0 } from "utils";

type PreviewTable = {
    rows: MetaTableRows;
    columns: MetaTableColumns;
};

type UploadResult = {
    level: string;
    message: string;
};

type Values = {
    csvfile: File | null;
    separator: string;
    skipLines: number;
    columnList: MetaTableColumns;
    params?: tree.Node<any>;
    preview: string[];
};

const initialValues = (): Values => ({
    csvfile: null,
    separator: ";",
    skipLines: 0,
    columnList: {},
    preview: [],
});

const validation = (values: Values, t: TFunction): ErrorsByAttribute => {
    const errors = {} as ErrorsByAttribute;

    if (!values.csvfile) errors["csvfile"] = t("mustChooseFileToUpload");
    if (values.skipLines < 0) errors["skipLines"] = t("skipLinesZeroPositive");
    if (!values.params) errors["params"] = t("paramsNotNull");

    const [, columns] = tableFromPreview(
        values.preview,
        values.separator,
        values.skipLines
    );

    if (Object.keys(values.columnList).length !== columns.size) {
        errors["preview"] = t("numberOfColumnsMismatch");
    }

    return errors;
};

const onSubmit = async (
    entity: EntitySpec,
    values: Values,
    apiToken: string,
    t: TFunction,
    verb: string
) => {
    const metadata = {
        entity_urn: entity.getUrn(),
        separator: values.separator,
        columns: Object.keys(values.columnList),
        skip_lines: values.skipLines,
    };

    const data = new FormData();
    data.append("csv", values.csvfile!);
    data.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );

    const result = await fetch(bulk_upload_url + `/${verb}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiToken}`,
        },
        body: data,
    });

    let asJson;
    try {
        asJson = await result.json();
    } catch (err) {
        let asText: string;
        try {
            asText = await result.text();
        } catch (e) {
            asText = e as any;
        }
        throw new Error(asText);
    }

    if (asJson.errors || Math.floor(result.status / 100) !== 2) {
        throw new Error(JSON.stringify(asJson));
    }

    return t("successUploadOk");
};

const ThinBorder = styled.div<{ variant: string }>`
    display: block;
    border: 2px solid ${(props) => props.theme.colors.variants};
`;

const toColumns = (node: tree.Node<any>): MetaTableColumns => {
    const columns = {} as MetaTableColumns;
    let parentEntity: EntitySpec | null = null;
    const traverse = (node: tree.Node<any>) => {
        if (node.kind === tree.Kind.Entity) {
            parentEntity = node.reference as EntitySpec;
            return;
        }
        if (node.kind !== tree.Kind.Attribute) return;

        const attribute = node.reference as Attribute;
        columns[node.uri] =
            attribute.name +
            (muri.depth(node.uri) > 3 ? ` (${parentEntity!.getName()})` : "");
    };

    tree.Builder.traversePreOrder(node, traverse);
    return columns;
};

const tableFromPreview = (
    preview: string[],
    separator: string,
    skipLines: number
): [MetaTableRows, Set<string>] => {
    const columnSet = new Set<string>();
    const rows = preview
        .filter((_, index) => index >= skipLines)
        .filter((line) => line.trim().length)
        .reduce((rows, line, index) => {
            rows[index.toString()] = line
                .split(separator)
                .reduce((columns, cell, cindex) => {
                    columns[cindex.toString()] = cell;
                    columnSet.add(cindex.toString());
                    return columns;
                }, {} as MetaTableColumns);
            return rows;
        }, {} as MetaTableRows);
    return [rows, columnSet];
};

const useMountCallback = (fun: (arg: any) => void) => useCallback(fun, []);

const TablePreview = ({
    id,
    title,
    skipLines,
    separator,
    params,
    columnList,
    setColumnList,
    preview,
    setPreview,
    file,
}: {
    id: string;
    title: string;
    skipLines: number;
    separator: string;
    params: tree.Node<any> | null;
    columnList: MetaTableColumns;
    setColumnList: (list: MetaTableColumns) => void;
    preview: string[];
    setPreview: (preview: string[]) => void;
    file: File | null;
}) => {
    const { t } = useTranslation();

    const setColumns = useMountCallback((list) => setColumnList(list));
    const setPreviewContent = useMountCallback((prev) => setPreview(prev));

    let previewTable: PreviewTable | null = null;
    if (preview.length) {
        const [rows, columnSet] = tableFromPreview(
            preview,
            separator,
            skipLines
        );
        previewTable = {
            rows,
            columns: Array.from(columnSet).reduce((acc, col) => {
                acc[col] = col;
                return acc;
            }, {} as MetaTableColumns),
        };
    }

    const renderJoined =
        previewTable &&
        Object.keys(columnList).length ===
            Object.keys(previewTable.columns).length;

    const joinedColumns =
        renderJoined &&
        Object.keys(columnList).reduce((cols, key, index) => {
            cols[index.toString()] = columnList[key];
            return cols;
        }, {} as MetaTableColumns);

    const onColumnReorder = (moved: string, before: string) => {
        if (renderJoined) {
            const keys = Object.keys(columnList);
            moved = keys[parseInt(moved)];
            before = keys[parseInt(before)];
        }
        const newColumns = Object.keys(columnList).reduce((reordered, key) => {
            if (key === moved) return reordered;

            if (key === before) {
                reordered[moved] = columnList![moved];
            }
            reordered[key] = columnList![key];
            return reordered;
        }, {} as MetaTableColumns);

        setColumns(newColumns);
    };

    useEffect(() => {
        setColumns(params ? toColumns(params) : {});
    }, [params, setColumns]);

    useEffect(() => {
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () =>
            setPreviewContent((reader.result! as string).split("\n", 5));
        reader.readAsText(file);
    }, [file, setPreviewContent]);

    return (
        <FormGroup key={id}>
            <Label for={id} className="mb-0">
                <strong>{title}</strong>
            </Label>
            <FormText className="mt-0">{t("reorderColumnsDragging")}</FormText>
            <FormError name={id} component="div" />
            {renderJoined && (
                <ThinBorder variant="success">
                    <MetaTable
                        columns={joinedColumns! as MetaTableColumns}
                        rows={previewTable!.rows}
                        loading={false}
                        onColumnReorder={onColumnReorder}
                    />
                </ThinBorder>
            )}
            {!renderJoined && columnList && (
                <ThinBorder variant="danger">
                    <MetaTable
                        columns={columnList}
                        rows={{} as MetaTableRows}
                        showRows={false}
                        loading={false}
                        onColumnReorder={onColumnReorder}
                    />
                </ThinBorder>
            )}
            {!renderJoined && previewTable && (
                <ThinBorder variant="danger" className="mt-3">
                    <MetaTable
                        columns={previewTable.columns}
                        rows={previewTable.rows}
                        showColumns={false}
                        loading={false}
                        onColumnReorder={onColumnReorder}
                    />
                </ThinBorder>
            )}
        </FormGroup>
    );
};

export type ImportObjectsFormProps = {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
    updateItems?: boolean;
};

/**
 * This form creates new items from a CSV file, by default.
 * It can also be used to update items from a CSV file (check props).
 *
 * @param props Set `updateItems` to true to update items from the list,
 *  instead of creating new ones.
 */
export const ImportObjectsForm = ({
    model,
    entity,
    updateItems = false,
}: ImportObjectsFormProps) => {
    const { t } = useTranslation();
    const { apiToken } = useAuth0();

    const formTitle = t("importList", { name: entity.getName() });
    const description = !updateItems ? (
        <p>
            This form <strong>creates new objects</strong> from a CSV imported
            file. Make sure you upload a file with all required attributes.
        </p>
    ) : (
        <p>
            This form <strong>updates objects</strong> from a CSV imported file.
            Make sure you upload a file referring to already existing objects.
        </p>
    );

    const verb = updateItems ? "update" : "create";

    return !apiToken ? null : (
        <React.Fragment>
            <FormTitle>{formTitle}</FormTitle>
            {description}
            <Formik
                // Use key to force component to be re-mounted when entity changes
                key={entity.getName()}
                initialValues={initialValues()}
                enableReinitialize={true}
                validate={(values) => validation(values, t)}
                onSubmit={(values, { setSubmitting }) =>
                    onSubmit(entity, values, apiToken, t, verb)
                        .then((msg) => {
                            setSubmitting(false);
                            toastSuccess(msg);
                        })
                        .catch((err) => {
                            console.error("upload failed:", err);
                            setSubmitting(false);
                            toastError(t("errorUploadFailed") + `: ${err}`);
                        })
                }
            >
                {({ isSubmitting, setFieldValue, values, errors }) => (
                    <Form>
                        <FilePicker
                            id="csvfile"
                            title={t("selectCSVFile")}
                            description={t("uploadCSVFormat")}
                            setFile={(file) => setFieldValue("csvfile", file)}
                        />
                        <SeparatorPicker
                            id="separator"
                            title={t("selectDelimiter")}
                            setValue={(separator: string) =>
                                setFieldValue("separator", separator)
                            }
                        />
                        <NumberPicker
                            id="skipLines"
                            title={t("skipNumberOfLines")}
                        />
                        <ColumnPicker
                            id="params"
                            title={t("selectColumns")}
                            model={model}
                            entity={entity}
                            setParams={(params: tree.Node<any>) =>
                                setFieldValue("params", params)
                            }
                        />
                        <TablePreview
                            id="preview"
                            title={t("uploadFilePreview")}
                            separator={values.separator}
                            skipLines={values.skipLines}
                            params={values.params || null}
                            columnList={values.columnList}
                            setColumnList={(list: MetaTableColumns) =>
                                setFieldValue("columnList", list)
                            }
                            preview={values.preview}
                            setPreview={(preview: string[]) =>
                                setFieldValue("preview", preview)
                            }
                            file={values.csvfile}
                        />
                        <LoadingButton
                            loading={isSubmitting}
                            disabled={
                                isSubmitting || Object.keys(errors).length > 0
                            }
                            text={
                                updateItems
                                    ? t("updateFromList")
                                    : t("createFromList")
                            }
                            loadingText={t("submittingFile")}
                        />
                        {Object.keys(errors).length ? (
                            <ListErrors errors={errors} />
                        ) : null}
                    </Form>
                )}
            </Formik>
        </React.Fragment>
    );
};
