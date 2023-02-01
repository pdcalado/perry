import React, { useEffect, useCallback } from "react";
import {
    EntitySpec,
    Model,
    Resolver,
    tree,
    Attribute,
    muri,
    QueryParams,
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
    ColumnPicker,
    FormError,
    ListErrors,
    NumberPicker,
    LoadingButton,
} from "./common";
import { FormGroup, Label, FormText } from "reactstrap";
import { TFunction } from "i18next";
import { saveAs } from "file-saver";

type PreviewTable = {
    rows: MetaTableRows;
    columns: MetaTableColumns;
};

type Values = {
    separator: string;
    limit: number;
    columnList: MetaTableColumns;
    params?: tree.Node<any>;
    preview: PreviewTable | null;
};

const initialValues = (): Values => ({
    separator: ";",
    limit: 0,
    columnList: {},
    preview: null,
});

const validation = (values: Values, t: TFunction): ErrorsByAttribute => {
    const errors = {} as ErrorsByAttribute;
    if (!values.params) errors["params"] = t("paramsNotNull");
    return errors;
};

const makeQueryParams = (params: tree.Node<any>): tree.Node<QueryParams> => {
    const queryParams: tree.Node<QueryParams> = tree.Builder.cloneInto(
        params,
        () => ({} as QueryParams)
    );
    tree.Builder.sanitize(queryParams);
    tree.Builder.insertDefaultAttributes(queryParams, () => ({}));
    return queryParams;
};

const onSubmit = async (values: Values, resolver: Resolver) => {
    const params = makeQueryParams(values.params!);

    const response = await resolver.requestDataObjects({
        limit: values.limit,
        params,
    });

    if (response.getError()) throw response.getError();

    const uris = Object.keys(values.columnList);
    const rows = response.indexByURIs(uris) as MetaTableRows;

    let text = "";
    for (let rowKey of Object.keys(rows)) {
        text +=
            Object.keys(values.columnList)
                .map(
                    (colKey) =>
                        rows[rowKey][colKey] &&
                        JSON.stringify(rows[rowKey][colKey])
                )
                .join(";") + "\n";
    }

    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `export-${new Date().toISOString()}.csv`);

    return;
};

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

const useMountCallback = (fun: (arg: any) => void) => useCallback(fun, []);

const TablePreview = ({
    id,
    title,
    separator,
    params,
    columnList,
    setColumnList,
    preview,
    setPreview,
    resolver,
}: {
    id: string;
    title: string;
    separator: string;
    params: tree.Node<any> | null;
    columnList: MetaTableColumns;
    setColumnList: (list: MetaTableColumns) => void;
    preview: PreviewTable | null;
    setPreview: (preview: PreviewTable | null) => void;
    resolver: Resolver;
}) => {
    const { t } = useTranslation();

    const setColumns = useMountCallback((list) => setColumnList(list));
    const setPreviewContent = useMountCallback((prev) => setPreview(prev));

    const onColumnReorder = (moved: string, before: string) => {
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
        if (!params) return;

        resolver
            .requestDataObjects({ limit: 1, params: makeQueryParams(params) })
            .then((response) => {
                if (response.getError()) throw response.getError();
                let columns = {} as MetaTableColumns;
                if (response && response.getParams()) {
                    columns = toColumns(response.getParams()!);
                }
                const uris = Object.keys(columns);
                const rows = response.indexByURIs(uris) as MetaTableRows;
                setPreviewContent({ rows, columns });
            })
            .catch((err) => {
                console.error("failed to get preview objects:", err);
            });
    }, [params, resolver, setPreviewContent]);

    return (
        <FormGroup key={id}>
            <Label for={id} className="mb-0">
                <strong>{title}</strong>
            </Label>
            <FormText className="mt-0">{t("reorderColumnsDragging")}</FormText>
            <FormError name={id} component="div" />
            {preview && (
                <MetaTable
                    columns={columnList}
                    rows={preview.rows}
                    showColumns={true}
                    loading={false}
                    onColumnReorder={onColumnReorder}
                />
            )}
        </FormGroup>
    );
};

export type ExportObjectsFormProps = {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
};

export const ExportObjectsForm = ({
    model,
    entity,
    resolver,
}: ExportObjectsFormProps) => {
    const { t } = useTranslation();

    const formTitle = t("exportList", { name: entity.getName() });

    return (
        <React.Fragment>
            <FormTitle className="mb-3">{formTitle}</FormTitle>
            <Formik
                // Use key to force component to be re-mounted when entity changes
                key={entity.getName()}
                initialValues={initialValues()}
                validate={(values) => validation(values, t)}
                onSubmit={(values, { setSubmitting }) =>
                    onSubmit(values, resolver)
                        .then(() => {
                            setSubmitting(false);
                            toastSuccess(t("fileCreatedSuccessfully"));
                        })
                        .catch((err) => {
                            console.error("download failed:", err);
                            setSubmitting(false);
                            toastError(t("errorDownloadFailed") + `: ${err}`);
                        })
                }
            >
                {({ isSubmitting, setFieldValue, values, errors }) => (
                    <Form>
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
                            title={t("downloadFilePreview")}
                            separator={values.separator}
                            params={values.params || null}
                            columnList={values.columnList}
                            setColumnList={(list: MetaTableColumns) =>
                                setFieldValue("columnList", list)
                            }
                            preview={values.preview}
                            setPreview={(preview: PreviewTable | null) =>
                                setFieldValue("preview", preview)
                            }
                            resolver={resolver}
                        />
                        <NumberPicker
                            id="limit"
                            title={t("limitNumberOfRecords")}
                            description={t("ifZeroNoLimit")}
                        />
                        <LoadingButton
                            loading={isSubmitting}
                            disabled={
                                isSubmitting || Object.keys(errors).length > 0
                            }
                            text={t("Download")}
                            loadingText={t("generatingFile")}
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
