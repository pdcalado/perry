import React from "react";
import { createLazyTab, createTabTitle, TabsAPI, useTabs } from "utils";
import { useEntityRelation, basename } from "ermodel";
import { BasicLoading } from "components";
import {
    EntitySpec,
    DataObject,
    Model,
    Resolver,
} from "perrydl";
import {
    CreateObjectForm,
    CreateAnyObject,
    EditObjectForm,
    DeleteObjectForm,
    ImportObjectsForm,
    ImportAnyObject,
    ImportUpdateAnyObject,
    ExportAnyObject,
    ExportObjectsForm,
    RelationFilter,
} from "forms";
import { Container, Row, Col } from "reactstrap";
import { Plus, Edit } from "icons";

export const createAnyObject = createLazyTab(
    "create-any-entity-object",
    "Create Any Entity Object",
    () =>
        Promise.resolve({
            default: (() => {
                const { model, resolver } = useEntityRelation();
                return model && resolver ? (
                    <CreateAnyObject model={model} resolver={resolver} />
                ) : (
                    <BasicLoading />
                );
            }) as React.FC<{}>,
        })
);

export const importAnyObject = createLazyTab(
    "import-any-entity-object",
    "Import Any Entity Object",
    () =>
        Promise.resolve({
            default: (() => {
                const { model, resolver } = useEntityRelation();
                return model && resolver ? (
                    <ImportAnyObject model={model} resolver={resolver} />
                ) : (
                    <BasicLoading />
                );
            }) as React.FC<{}>,
        })
);

export const importUpdateAnyObject = createLazyTab(
    "import-update-any-entity-object",
    "Import Update Any Entity Object",
    () =>
        Promise.resolve({
            default: (() => {
                const { model, resolver } = useEntityRelation();
                return model && resolver ? (
                    <ImportUpdateAnyObject model={model} resolver={resolver} />
                ) : (
                    <BasicLoading />
                );
            }) as React.FC<{}>,
        })
);

export const exportAnyObject = createLazyTab(
    "export-any-entity-object",
    "Export Any Entity Object",
    () =>
        Promise.resolve({
            default: (() => {
                const { model, resolver } = useEntityRelation();
                return model && resolver ? (
                    <ExportAnyObject model={model} resolver={resolver} />
                ) : (
                    <BasicLoading />
                );
            }) as React.FC<{}>,
        })
);

const Containerized: React.FC = ({ children }) => (
    <Container fluid className="pt-2">
        <Row>
            <Col lg="12">{children}</Col>
        </Row>
    </Container>
);

type ExpectsERModel = (
    model: Model,
    resolver: Resolver,
    entity: EntitySpec,
    tabsAPI: TabsAPI
) => React.ReactNode;

const ErContainer = ({ comp, urn }: { comp: ExpectsERModel; urn: string }) => {
    const { model, resolver } = useEntityRelation();
    const { tabsAPI } = useTabs();

    if (!model || !resolver) {
        return <BasicLoading />;
    }

    const entity = model.findEntityByUrn(urn);
    return entity === undefined ? (
        <p>Entity with URN {urn} not found</p>
    ) : (
        <Containerized>{comp(model, resolver, entity, tabsAPI)}</Containerized>
    );
};

export const createSpecificObjectFromUrn = (
    urn: string,
    title: string,
    initial?: DataObject
) =>
    createLazyTab(
        `create-specific-entity-object-${basename(urn)}`,
        createTabTitle(<Plus />, title),
        () =>
            Promise.resolve({
                default: (() => (
                    <ErContainer
                        urn={urn}
                        comp={(model, resolver, entity) => (
                            <CreateObjectForm
                                model={model}
                                resolver={resolver}
                                entity={entity}
                                initial={initial}
                            />
                        )}
                    />
                )) as React.FC,
            })
    );

export const createSpecificObject = (entity: EntitySpec, title: string) =>
    createLazyTab(
        `create-specific-entity-object-${entity.getSingular()}`,
        createTabTitle(<Plus />, title),
        () =>
            Promise.resolve({
                default: (() => {
                    const { model, resolver } = useEntityRelation();
                    return model && resolver ? (
                        <Containerized>
                            <CreateObjectForm
                                model={model}
                                resolver={resolver}
                                entity={entity}
                            />
                        </Containerized>
                    ) : (
                        <BasicLoading />
                    );
                }) as React.FC<{}>,
            })
    );

export const editSpecificObjectFromUrn = (
    urn: string,
    title: string,
    id: number
) =>
    createLazyTab(
        `edit-specific-entity-object-${basename(urn)}`,
        createTabTitle(<Edit />, title),
        () =>
            Promise.resolve({
                default: (() => (
                    <ErContainer
                        urn={urn}
                        comp={(model, resolver, entity) => (
                            <EditObjectForm
                                model={model}
                                resolver={resolver}
                                entity={entity}
                                id={id}
                            />
                        )}
                    />
                )) as React.FC<{}>,
            })
    );

export const deleteSpecificObjectFromUrn = (
    urn: string,
    title: string,
    id: number
) => ({
    header: <strong>{title}</strong>,
    body: (
        <ErContainer
            urn={urn}
            comp={(model, resolver, entity, tabsAPI) => (
                <DeleteObjectForm
                    model={model}
                    resolver={resolver}
                    entity={entity}
                    id={id}
                    onChange={tabsAPI.closeModal}
                />
            )}
        />
    ),
});

export const createObjectInModal = (
    urn: string,
    title: string,
    otherProps: {
        onCreate?: (object: DataObject) => void;
        relationFilter?: RelationFilter;
        initial?: DataObject;
        notify?: boolean;
        onDone?: () => void;
    }
) => ({
    header: <strong>{title}</strong>,
    body: (
        <ErContainer
            urn={urn}
            comp={(model, resolver, entity, tabsAPI) => (
                <CreateObjectForm
                    model={model}
                    resolver={resolver}
                    entity={entity}
                    onCreate={otherProps.onCreate}
                    onDone={() => {
                        tabsAPI.closeModal();
                        otherProps.onDone && otherProps.onDone();
                    }}
                    showTitle={false}
                    notify={otherProps.notify}
                    relationFilter={otherProps.relationFilter}
                    initial={otherProps.initial}
                />
            )}
        />
    ),
});

export const editObjectInModal = (
    urn: string,
    title: string,
    id: number,
    otherProps: {
        relationFilter?: RelationFilter;
        notify?: boolean;
        onDone?: () => void;
    }
) => ({
    header: <strong>{title}</strong>,
    body: (
        <ErContainer
            urn={urn}
            comp={(model, resolver, entity, tabsAPI) => (
                <EditObjectForm
                    model={model}
                    resolver={resolver}
                    entity={entity}
                    id={id}
                    onDone={() => {
                        tabsAPI.closeModal();
                        otherProps.onDone && otherProps.onDone();
                    }}
                    notify={otherProps.notify}
                    showTitle={false}
                    relationFilter={otherProps.relationFilter}
                />
            )}
        />
    ),
});

export const importNewObjectsFromUrn = (
    urn: string,
    title: string,
    icon: React.ReactChild
) =>
    createLazyTab(
        `import-new-list-${basename(urn)}`,
        createTabTitle(icon, title),
        () =>
            Promise.resolve({
                default: (() => (
                    <ErContainer
                        urn={urn}
                        comp={(model, resolver, entity) => (
                            <ImportObjectsForm
                                model={model}
                                resolver={resolver}
                                entity={entity}
                                updateItems={false}
                            />
                        )}
                    />
                )) as React.FC<{}>,
            })
    );

export const importUpdateObjectsFromUrn = (
    urn: string,
    title: string,
    icon: React.ReactChild
) =>
    createLazyTab(
        `import-update-list-${basename(urn)}`,
        createTabTitle(icon, title),
        () =>
            Promise.resolve({
                default: (() => (
                    <ErContainer
                        urn={urn}
                        comp={(model, resolver, entity) => (
                            <ImportObjectsForm
                                model={model}
                                resolver={resolver}
                                entity={entity}
                                updateItems={true}
                            />
                        )}
                    />
                )) as React.FC<{}>,
            })
    );

export const exportObjectsFromUrn = (
    urn: string,
    title: string,
    icon: React.ReactChild
) =>
    createLazyTab(
        `export-list-${basename(urn)}`,
        createTabTitle(icon, title),
        () =>
            Promise.resolve({
                default: (() => (
                    <ErContainer
                        urn={urn}
                        comp={(model, resolver, entity) => (
                            <ExportObjectsForm
                                model={model}
                                resolver={resolver}
                                entity={entity}
                            />
                        )}
                    />
                )) as React.FC<{}>,
            })
    );
