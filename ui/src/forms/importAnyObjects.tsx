import React, { useState } from "react";
import { Container, Col, Row } from "reactstrap";
import { EntitySpec, Model, Resolver } from "perrydl";
import { BasicSelect } from "components";
import { ImportObjectsForm } from "forms";

export const ImportUpdateAnyObject = ({
    model,
    resolver,
}: {
    model: Model;
    resolver: Resolver;
}) => ImportObjects({
    model: model,
    resolver: resolver,
    updateItems: true
});

export const ImportAnyObject = ({
    model,
    resolver,
}: {
    model: Model;
    resolver: Resolver;
}) => ImportObjects({
    model: model,
    resolver: resolver,
    updateItems: false
});

const ImportObjects = ({
    model,
    resolver,
    updateItems = false,
}: {
    model: Model;
    resolver: Resolver;
    updateItems: boolean | undefined;
}) => {
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
            <Row>
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
                <Col lg="12" className="pt-2">
                    {displayEntity && (
                        <ImportObjectsForm
                            model={model}
                            resolver={resolver}
                            entity={displayEntity}
                            updateItems={updateItems}
                        />
                    )}
                </Col>
            </Row>
        </Container>
    );
};
