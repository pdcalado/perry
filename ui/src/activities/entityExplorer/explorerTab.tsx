import React, { useState, useEffect, useCallback } from "react";
import { Container, Col, Row, Alert } from "reactstrap";
import {
    EntitySpec,
    Attribute,
    DataObject,
    attributeIsText,
    isCommonAttribute,
    tree,
    muri,
    QueryParams,
    QueryResponse,
    Resolver,
    Model,
} from "perrydl";
import {
    MetaTable,
    MetaTableCells,
    MetaTableRows,
    BasicSelect,
    BasicLoading,
    ModelTree,
    PickerList,
    PickerOption,
    TextSearchWithControls,
    Collapsable,
    ContextMenuItem,
} from "components";
import {
    useEntityRelation,
    useQuery,
    menuOptionEdit,
    menuOptionDelete,
 } from "ermodel";
import { useTabs, TabsAPI } from "utils";
import { TFunction } from "i18next";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

const rowOptions = (
    t: TFunction,
    tabsAPI: TabsAPI,
    urn: string,
    id: number,
    title: string,
): ContextMenuItem[] => [
    menuOptionEdit(t, tabsAPI, title, urn, id),
    menuOptionDelete(t, tabsAPI, title, urn, id),
];

const findById = (
    response: QueryResponse,
    plural: string,
    id: string,
): DataObject | undefined => {
    const data = response.getData();
    if (!data) return undefined;
    
    return data[plural].find((object) => ("" + object.id) === id);
};

const QueryFragment = ({
    resolver,
    queryParams,
    textInput,
}: {
    resolver: Resolver;
    queryParams: tree.Node<QueryParams>;
    textInput: string;
}) => {
    // Use tabs and translation
    const { tabsAPI } = useTabs();
    const { t } = useTranslation();

    // useQuery hook for performing database queries.
    const { doQuery, loading, response } = useQuery({ resolver, queryParams });

    // useCallback to prevent placing "doQuery" in useEffect's dependencies
    const queryCallback = useCallback(doQuery, [queryParams]);

    // Perform query when text input changes
    useEffect(() => {
        queryCallback(textInput);
    }, [queryCallback, textInput]);

    const columns = {} as MetaTableCells;
    if (response && response.getParams()) {
        let parentEntity: EntitySpec | null = null;
        tree.Builder.traversePreOrder(response.getParams()!, (node) => {
            if (node.kind === tree.Kind.Entity) {
                parentEntity = node.reference as EntitySpec;
                return;
            }
            if (node.kind === tree.Kind.Attribute) {
                if (isCommonAttribute(muri.basename(node.uri))) return;
                const attribute = node.reference as Attribute;
                columns[node.uri] =
                    attribute.name +
                    (muri.depth(node.uri) > 3
                        ? ` (${parentEntity!.getName()})`
                        : "");
            }
        });
    }

    const uris = Object.keys(columns);
    const rows: MetaTableRows =
        (response?.indexByURIs(uris) as MetaTableRows) || {};
    const error = response?.getError();

    return error ? (
        <Alert color="danger">{error!.toString()}</Alert>
    ) : (
        <MetaTable
            columns={columns}
            rows={rows}
            loading={loading}
            onCellContextMenu={(rowKey) => {
                if (uris.length === 0) {
                    return [];
                }

                if (!response) {
                    return [];
                }

                const uri =  queryParams.uri;
                const entity = resolver.model.findEntityByUrn(uri);
                const plural = entity!.getPlural()

                const obj = findById(response, plural, rowKey);
                if (!obj) {
                    return [];
                }

                const entityName = entity!.getName();
                const title = t("withID", {entityName, id: obj.id});

                return rowOptions(t, tabsAPI, uri, obj.id, title);
            }}
        />
    );
};

const toTextSearchable = (node: tree.Node<any>): PickerList => {
    const picked = {} as PickerList;
    let parentEntity: EntitySpec | null = null;
    const traverse = (node: tree.Node<any>) => {
        if (node.kind === tree.Kind.Entity) {
            parentEntity = node.reference as EntitySpec;
            return;
        }
        if (node.kind !== tree.Kind.Attribute) return;

        const attribute = node.reference as Attribute;
        if (attributeIsText(attribute))
            picked[node.uri] = {
                checked: true,
                value:
                    attribute.name +
                    (muri.depth(node.uri) > 3
                        ? ` (${parentEntity!.getName()})`
                        : ""),
            };
    };

    tree.Builder.traversePreOrder(node, traverse);
    return picked;
};

const extendParams = (
    queryParams: tree.Node<any>,
    textSearchable: PickerList
): tree.Node<QueryParams> => {
    const withByTextParam = tree.Builder.cloneInto(
        queryParams,
        (node: tree.Node<any>): QueryParams =>
            Object.assign(
                {
                    ...node.inner,
                    byText: textSearchable[node.uri]?.checked,
                },
                {} as QueryParams
            )
    );

    // Inject DB attributes like "id", "created_at" etc
    tree.Builder.insertDefaultAttributes(withByTextParam, () =>
        Object.assign({ byText: false }, {})
    );
    return withByTextParam;
};

const SearchFragment = ({ queryParams }: { queryParams: tree.Node<any> }) => {
    const initTextSearchable = toTextSearchable(queryParams);

    // Attributes to search by text
    const [textSearchable, setTextSearchable] = useState<PickerList>(
        initTextSearchable
    );
    // Text input for searching
    const [textInput, setTextInput] = useState<string>("");
    // Query parameters with ByText parameter
    const [withByText, setWithByText] = useState<tree.Node<QueryParams> | null>(
        null
    );
    // Use a resolver for the query fragment
    const { resolver } = useEntityRelation();

    useEffect(() => {
        const newTextSearchable = toTextSearchable(queryParams);
        setTextSearchable(newTextSearchable);
        const newWithByText = extendParams(queryParams, newTextSearchable);
        setWithByText(newWithByText);
    }, [queryParams]);

    return (
        <React.Fragment>
            <Col lg="12" className="pt-2">
                <TextSearchWithControls
                    textInput={textInput}
                    textSearchable={textSearchable}
                    onTextChange={(text) => setTextInput(text)}
                    onPickAttribute={(key: string, option: PickerOption) => {
                        const newTextSearchable = {
                            ...textSearchable,
                            [key]: { ...option },
                        };
                        setTextSearchable(newTextSearchable);
                        const newWithByText = extendParams(
                            queryParams,
                            newTextSearchable
                        );
                        setWithByText(newWithByText);
                    }}
                />
            </Col>
            {resolver && withByText && (
                <Col lg="12" className="pt-2">
                    <QueryFragment
                        resolver={resolver}
                        queryParams={withByText}
                        textInput={textInput}
                    />
                </Col>
            )}
        </React.Fragment>
    );
};

const EntityContainer = ({
    model,
    entity,
}: {
    model: Model;
    entity: EntitySpec;
}) => {
    const { t } = useTranslation();
    const [queryParams, setQueryParams] = useState<tree.Node<any> | null>(null);

    return (
        <React.Fragment>
            <Col lg="12" className="pt-2">
                <Collapsable title={t("Filter Attributes")}>
                    <ModelTree
                        model={model}
                        rootUrn={entity.getUrn()}
                        onChangeGraph={(node) => setQueryParams(node)}
                    />
                </Collapsable>
            </Col>
            {queryParams && <SearchFragment queryParams={queryParams} />}
        </React.Fragment>
    );
};

const CenteredRow = styled(Row)`
    align-items: center;
`;

const Consumer = ({ model }: { model: Model }) => {
    const [displayEntity, setDisplayEntity] = useState<EntitySpec | undefined>(
        model.getEntities()[0]
    );

    const entityNamesByUrn = model.getEntities().reduce((obj, entity) => {
        obj[entity.getUrn()] = entity.getName();
        return obj;
    }, {} as { [key: string]: string });

    const onEntitySelect = (key: string) =>
        setDisplayEntity(model.findEntityByUrn(key)!);

    return (
        <Container className="animated fadeIn pt-2" fluid>
            <CenteredRow>
                <Col lg="3">
                    <BasicSelect
                        size="sm"
                        options={entityNamesByUrn}
                        onChange={onEntitySelect}
                    />
                </Col>
                <Col lg="auto">
                    {displayEntity && displayEntity.getDescription()}
                </Col>
                {displayEntity && (
                    <EntityContainer model={model} entity={displayEntity} />
                )}
            </CenteredRow>
        </Container>
    );
};

const EntityExplorer = () => {
    const { model } = useEntityRelation();
    return model ? <Consumer model={model} /> : <BasicLoading />;
};

export default EntityExplorer;
