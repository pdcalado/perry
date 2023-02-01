import React, { useState, useEffect } from "react";
import {
    EntitySpec,
    Model,
    DataObject,
    Resolver,
    CommonAttributes,
    ID_FIELD,
    DataAny,
    isCommonAttribute,
} from "perrydl";
import { toastSuccess, toastError, BasicLoading, toastWarn } from "components";
import { Form, Formik } from "formik";
import ajv from "ajv";
import {
    paramsForObjectEdit,
    ObjectFetch,
    FetchStatus,
    fetchWithStatus,
} from "ermodel";
import { useTranslation } from "react-i18next";
import {
    SubmitButton,
    FormTitle,
    attributeFormGroups,
    validation,
    castValues,
    RelationForm,
    RelationFilter,
} from "./common";

const Ajv = new ajv({ coerceTypes: true, removeAdditional: false });

const arraysAreEqual = (left: number[], right: number[]): boolean => {
    if (left.length !== right.length) return false;

    for (let index in left) {
        if (left[index] !== right[index]) return false;
    }
    return true;
};

// Make an object with the differences between local and remote object.
const makeDiff = (
    entity: EntitySpec,
    values: DataObject,
    initial: DataObject,
    validator: ajv.ValidateFunction
): { [key: string]: DataAny } => {
    // Cast values to their proper formats
    const [valuesCast] = castValues(entity, values, validator);
    const [initialCast] = castValues(entity, initial, validator);

    // Restore relation fields (which are removed by the cast)
    const valuesRestored = { ...values, ...valuesCast } as DataObject;
    const initialRestored = { ...initial, ...initialCast } as DataObject;

    // Remove common attributes which are not "id"
    for (let attribute of CommonAttributes.filter((a) => a.id !== ID_FIELD)) {
        if (attribute.id in valuesRestored) delete valuesRestored[attribute.id];
        if (attribute.id in initialRestored)
            delete initialRestored[attribute.id];
    }

    const diff = {} as { [key: string]: DataAny };
    const notCommon = (key: string) => !isCommonAttribute(key);
    const initialKeys = Object.keys(initialRestored).filter(notCommon);

    // Compare all keys starting with initial object.
    for (let key of initialKeys) {
        const value = valuesRestored[key];
        const init = initialRestored[key];

        if (init === value) continue;

        // For custom attributes, do a deepEqual test
        if (entity.findAttributeById(key)) {
            if (typeof init === "object") {
                const left = JSON.stringify(init);
                const right = JSON.stringify(value);
                if (left === right) continue;
            }
            diff[key] = value;
            continue;
        }

        // Compare relations
        // If types are different, then assume a diff
        if (typeof init !== typeof value) {
            diff[key] = value;
            continue;
        }

        // If they are arrays, compare all ids
        if (typeof init === "object" && Array.isArray(init)) {
            const left = (init as DataObject[]).map((o) => o.id);
            const right = (value as DataObject[]).map((o) => o.id);
            if (!arraysAreEqual(left, right))
                diff[key] = (value as DataObject[]).map((o) => ({ id: o.id }));
            continue;
        }

        // If one is null or undefined, then assume a diff
        if (
            init === null ||
            init === undefined ||
            value === null ||
            value === undefined
        ) {
            diff[key] = value ? { id: (value as DataObject).id } : value;
            continue;
        }

        // If they are plain objects, just compare ids
        if ((init as DataObject).id !== (value as DataObject).id)
            diff[key] = { id: (value as DataObject).id };
    }

    console.log("diff", diff);

    return diff;
};

const onSubmit = async (
    entity: EntitySpec,
    id: number,
    diff: { [key: string]: DataAny },
    resolver: Resolver
) => {
    const response = await resolver.updateObject(entity, { id, ...diff });
    return response.getError()
        ? Promise.reject(response.getError())
        : Promise.resolve(response.getData());
};

const WithValidator = ({
    model,
    entity,
    resolver,
    validator,
    initial,
    id,
    relationFilter = new RelationFilter(entity),
    showTitle = true,
    notify = true,
    onDone = () => {},
}: EditObjectFormProps & {
    validator: ajv.ValidateFunction;
    initial: DataObject;
}) => {
    const { t } = useTranslation();

    const relations = model
        .getRelationsOfEntity(entity.getUrn())
        .map((relationUrn) => model.findRelationByUrn(relationUrn)!)
        .filter((relation) => relationFilter.pass(relation));

    const formTitle = t("edit", { name: entity.getName() }) + ` (id: ${id})`;

    return (
        <React.Fragment>
            {showTitle && <FormTitle>{formTitle}</FormTitle>}
            <Formik
                // Use key to force component to be re-mounted when entity changes
                key={entity.getName()}
                initialValues={initial}
                validate={(values) => validation(entity, values, validator)}
                onSubmit={(values, { setSubmitting }) => {
                    const diff = makeDiff(entity, values, initial, validator);
                    if (!Object.keys(diff).length) {
                        notify && toastWarn(t("nothingToUpdate"));
                        setSubmitting(false);
                        return;
                    }
                    onSubmit(entity, id, diff, resolver)
                        .then(() => {
                            setSubmitting(false);
                            notify &&
                                toastSuccess(
                                    t("wasSuccessful", { operation: formTitle })
                                );
                            onDone();
                        })
                        .catch((err) => {
                            console.error("failed to submit", err);
                            setSubmitting(false);
                            notify &&
                                toastError(
                                    t("failedWith", {
                                        operation: formTitle,
                                        error: err,
                                    })
                                );
                            onDone();
                        });
                }}
            >
                {({ isSubmitting, setFieldValue, errors }) => (
                    <Form>
                        {attributeFormGroups(entity)}
                        <RelationForm
                            entity={entity}
                            relations={relations}
                            model={model}
                            setFieldValue={setFieldValue}
                            initial={initial}
                            parentId={id}
                        />
                        <SubmitButton
                            disabled={
                                isSubmitting || Object.keys(errors).length > 0
                            }
                        />
                    </Form>
                )}
            </Formik>
        </React.Fragment>
    );
};

export type EditObjectFormProps = {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
    id: number;
    relationFilter?: RelationFilter;
    showTitle?: boolean;
    notify?: boolean;
    onDone?: () => void;
};

export const EditObjectForm = ({
    model,
    resolver,
    entity,
    id,
    ...otherProps
}: EditObjectFormProps) => {
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

    const initial = objects[0];

    return (
        <WithValidator
            model={model}
            resolver={resolver}
            entity={entity}
            validator={Ajv.compile(entity.getSchema())}
            initial={initial}
            id={id}
            {...otherProps}
        />
    );
};
