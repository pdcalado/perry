import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Model,
    EntitySpec,
    DataObject,
    Resolver,
} from "perrydl";
import {
    ObjectFetch,
    FetchStatus,
    paramsForObjectEdit,
    fetchWithStatus,
} from "ermodel";
import {
    toastError,
    BasicLoading,
    BasicButtonProps,
    BasicButton,
    toastSuccess,
} from "components";
import { Label, FormGroup } from "reactstrap";
import { Form, Formik } from "formik";
import { renderAny } from "./common";

// Assume text is in snake case format
const titleize = (text: string): string => {
    return text
        .split("_")
        .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1))
        .join(" ");
};

const DeleteButton: React.FC<BasicButtonProps> = (props) => {
    const { t } = useTranslation();
    return (
        <BasicButton className="mt-3" type="submit" {...props} variant="danger">
            {t("Delete")}
        </BasicButton>
    );
};

const onDelete = async (
    entity: EntitySpec,
    resolver: Resolver,
    object: DataObject
) => {
    const response = await resolver.deleteObject(entity, object);
    console.log("response", response);
    return response.getError()
        ? Promise.reject(response.getError())
        : Promise.resolve(response.getData());
};

const DeleteForm = ({
    object,
    entity,
    resolver,
    onChange = () => {},
}: {
    object: DataObject;
    entity: EntitySpec;
    resolver: Resolver;
    onChange?: () => void;
}) => {
    const { t } = useTranslation();
    const operation = t("delete", { name: entity.getName() });

    return (
        <Formik
            key={`${entity.getId()}-${object.id}`}
            initialValues={{}}
            onSubmit={(_, { setSubmitting }) => {
                onDelete(entity, resolver, object)
                    .then(() => {
                        setSubmitting(false);
                        toastSuccess(t("wasSuccessful", { operation }));
                        onChange();
                    })
                    .catch((err) => {
                        console.error("failed to submit", err);
                        setSubmitting(false);
                        toastError(
                            t("failedWith", {
                                operation,
                                error: err,
                            })
                        );
                    });
            }}
        >
            {({ isSubmitting, errors }) => (
                <Form>
                    {Object.keys(object).map((key) => (
                        <FormGroup key={key} className="mb-0">
                            <Label key={key} className="mr-2">
                                <strong>{titleize(key)}:</strong>
                            </Label>
                            <Label key={"field-value"}>
                                {renderAny(object[key])}
                            </Label>
                        </FormGroup>
                    ))}
                    <DeleteButton
                        variant="danger"
                        disabled={
                            isSubmitting || Object.keys(errors).length > 0
                        }
                    />
                </Form>
            )}
        </Formik>
    );
};

export type DeleteObjectFormProps = {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
    id: number;
    onChange?: () => void;
};

export const DeleteObjectForm = ({
    model,
    resolver,
    entity,
    id,
    onChange,
}: DeleteObjectFormProps) => {
    const { t } = useTranslation();
    const [objectFetch, setObjectFetch] = useState<ObjectFetch>({
        status: FetchStatus.Loading,
    });

    useEffect(() => {
        const params = paramsForObjectEdit(model, entity, id);
        fetchWithStatus(resolver, params).then((ofetch) => {
            setObjectFetch(ofetch);
            ofetch.error && toastError(ofetch.error.toString());
        });
    }, [id, model, entity, resolver, setObjectFetch]);

    switch (objectFetch.status) {
        case FetchStatus.Loading:
            return <BasicLoading />;
        case FetchStatus.Failure:
            return <p>{objectFetch.error!.toString()}</p>;
    }

    const data = objectFetch.response!.getData()!;
    const objects = data[entity.getPlural()];

    if (!objects.length) {
        return <p>{t("objectNotFound") + " { id: " + id + " }"} </p>;
    }

    return (
        <DeleteForm
            object={objects[0]}
            entity={entity}
            resolver={resolver}
            onChange={onChange}
        />
    );
};
