import React from "react";
import {
    EntitySpec,
    Model,
    DataAny,
    DataObject,
    RelationSide,
    Resolver,
    isCommonAttribute,
} from "perrydl";
import { toastSuccess, toastError } from "components";
import { Form, Formik } from "formik";
import ajv from "ajv";
import { useTranslation } from "react-i18next";
import {
    FormTitle,
    SubmitButton,
    attributeFormGroups,
    validation,
    castValues,
    RelationForm,
    RelationFilter,
} from "./common";

const Ajv = new ajv({ coerceTypes: true, removeAdditional: false });

const cleanNestedPrefill = (input: DataObject): DataObject => ({
    id: input.id,
});

const cleanPrefill = (
    entity: EntitySpec,
    prefill?: DataObject
): { [key: string]: DataAny } | null => {
    if (!prefill) return null;

    const clone: { [key: string]: DataAny } = { ...prefill };

    for (let key of Object.keys(clone)) {
        // Delete common attributes
        if (isCommonAttribute(key)) {
            delete clone[key];
            continue;
        }

        // Ignore custom attributes
        if (entity.findAttributeById(key)) continue;

        // From nested objects, remove common attributes but not ID
        if (typeof clone[key] !== "object") continue;

        if (Array.isArray(clone[key]))
            clone[key] = (prefill[key] as DataObject[]).map((o) =>
                cleanNestedPrefill(o)
            ) as DataObject[];
        else
            clone[key] = cleanNestedPrefill(
                prefill[key] as DataObject
            ) as DataObject;
    }
    return clone;
};

const initialValues = (
    model: Model,
    entity: EntitySpec,
    prefill?: DataObject
): DataObject => {
    // Handle attributes first
    const values = entity.getCustomAttributes().reduce((obj, attribute) => {
        obj[attribute.id] = "";
        return obj;
    }, {} as DataObject);

    // Handle related objects
    model
        .getRelationsOfEntity(entity.getUrn())
        .map((relationUrn) => model.findRelationByUrn(relationUrn)!)
        .forEach((relation) => {
            const other = model.getRelatedEntity(
                entity.getUrn(),
                relation.getUrn()
            )!;
            const side = relation.getSide(entity.getUrn());
            if (
                side === RelationSide.ManyToMany ||
                side === RelationSide.OneToMany
            )
                values[other.getPlural()] = [] as DataObject[];
            else values[other.getSingular()] = null;
        });

    // Clean form prefill
    // Leave out common attributes
    let sanePrefill = cleanPrefill(entity, prefill);

    return sanePrefill ? { ...values, ...sanePrefill } : values;
};

const onSubmit = async (
    entity: EntitySpec,
    values: DataObject,
    validator: ajv.ValidateFunction,
    onCreate: (object: DataObject) => void
) => {
    // Cast values to their proper formats
    const [cast] = castValues(entity, values, validator);
    console.log("post cast:", cast);
    // Restore relation fields (which are removed by the cast)
    const restored = { ...values, ...cast } as DataObject;
    console.log("restored:", restored);
    // Remove nulls
    // Ignore empty arrays
    for (const key in restored) {
        let value = restored[key];
        if (value === null) delete restored[key];
        if (Array.isArray(value) && value.length === 0) delete restored[key];
    }
    console.log("sanitized values:", restored);

    return onCreate(restored);
};

const postObject = async (
    entity: EntitySpec,
    resolver: Resolver,
    object: DataObject
) => {
    const response = await resolver.createObject(entity, object);
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
    onCreate = (object) => postObject(entity, resolver, object),
    relationFilter = new RelationFilter(entity),
    showTitle = true,
    notify = true,
    onDone = () => {},
}: CreateObjectFormProps & {
    initial: DataObject;
    validator: ajv.ValidateFunction;
}) => {
    const { t } = useTranslation();

    const relations = model
        .getRelationsOfEntity(entity.getUrn())
        .map((relationUrn) => model.findRelationByUrn(relationUrn)!)
        .filter((relation) => relationFilter.pass(relation));

    const formTitle = t("createNew", { name: entity.getName() });

    return (
        <React.Fragment>
            {showTitle ? <FormTitle>{formTitle}</FormTitle> : null}
            <Formik
                // Use key to force component to be re-mounted when entity changes
                key={entity.getName()}
                initialValues={initial}
                validate={(values) => validation(entity, values, validator)}
                onSubmit={(values, { setSubmitting }) => {
                    onSubmit(entity, values, validator, onCreate)
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

export type CreateObjectFormProps = {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
    initial?: DataObject;
    onCreate?: (object: DataObject) => void;
    relationFilter?: RelationFilter;
    showTitle?: boolean;
    notify?: boolean;
    onDone?: () => void;
};

export const CreateObjectForm = ({
    model,
    resolver,
    entity,
    initial,
    ...otherProps
}: CreateObjectFormProps) => (
    <WithValidator
        model={model}
        resolver={resolver}
        entity={entity}
        validator={Ajv.compile(entity.getSchema())}
        initial={initialValues(model, entity, initial)}
        {...otherProps}
    />
);
