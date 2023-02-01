import React, { useState, useEffect } from "react";
import styled, { css } from "styled-components";
import { ErrorMessage, useFormikContext, FormikErrors } from "formik";
import {
    BasicButton,
    Collapsable,
    CollapsableProps,
    BasicButtonProps,
    toastError,
    ModelTree,
    toastSuccess,
} from "components";
import {
    EntitySpec,
    RelationSpec,
    DataObject,
    RelationSide,
    DataAny,
    Attribute,
    TypeOfAttribute,
    Resolver,
    CommonAttributes,
    Model,
    tree,
    ID_FIELD,
} from "perrydl";
import {
    relatedFieldName,
    SingleItemDrop,
    FuzzyPicker,
    createSpecificObject,
    MultiItemDrop,
    useEntityRelation,
    paramsForObjectDisplay,
    fetchWithStatus,
    createObjectInModal,
    MultiItemEdit,
} from "ermodel";
import { useTranslation } from "react-i18next";
import { FormGroup, Label, FormText } from "reactstrap";
import { InputField, InputFile } from "./inputs";
import { PlusCircle, CircleNotch } from "icons";
import { useTabs } from "utils";
import ajv from "ajv";

const printMaxLength = 20;
const marginSize = "3";
const bottomMargin = "mb-" + marginSize;
const Separator = () => <div className={bottomMargin}></div>;

type SetValue = (value: DataObject[] | DataObject | null) => void;

export interface ErrorsByAttribute {
    [key: string]: string;
}

const unwrapErrors = (errors: ajv.ErrorObject[]): ErrorsByAttribute => {
    if (!errors[0] || !errors[0].dataPath) return { message: "unknown error" };

    const error = errors[0];
    const attribute = error.dataPath!.slice(1);
    if (attribute === "") return { message: "unknown error" };
    return {
        [attribute]: `${error.keyword} error: ${error.message}`,
    };
};

// Cast empty strings to null
const nullify = (entity: EntitySpec, values: DataObject): DataObject => {
    return Object.keys(values).reduce((obj, key) => {
        const attribute = entity.findAttributeById(key);
        if (!attribute) return obj;
        if (typeof values[key] === "string" && values[key] === "") {
            obj[key] = null;
            return obj;
        }
        obj[key] = values[key];
        return obj;
    }, {} as DataObject);
};

export const validation = (
    entity: EntitySpec,
    values: DataObject,
    validator: ajv.ValidateFunction
): ErrorsByAttribute => castValues(entity, values, validator)[1];

export const castValues = (
    entity: EntitySpec,
    values: DataObject,
    validator: ajv.ValidateFunction
): [DataObject, ErrorsByAttribute] => {
    const nulled = nullify(entity, values);
    const valid = validator(nulled);
    return [nulled, valid ? {} : unwrapErrors(validator.errors!)];
};

export const FormError = styled(ErrorMessage)`
    color: ${(props) => props.theme.colors.danger};
`;

export const FormTitle = styled.h3`
    width: 100%;
    color: ${(props) => props.theme.colors.white};
    font-weight: bold;
`;

export const FormNest: React.FC<CollapsableProps> = ({
    children,
    ...props
}) => (
    <Collapsable
        className={
            (props.className ? props.className + " " : "") + bottomMargin
        }
        {...props}
    >
        {children}
    </Collapsable>
);

export const FilePicker = ({
    id,
    title,
    description,
    setFile,
}: {
    id: string;
    title: string;
    description: string;
    setFile: (file: File | null) => void;
}) => (
    <FormGroup key={id}>
        <Label for={id} className="mb-0">
            <strong>{title}</strong>
        </Label>
        <FormText className="mt-0">{description}</FormText>
        <InputFile
            type="file"
            name={id}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const files = event.currentTarget.files;
                if (files && files[0]) setFile(files[0]);
                else setFile(null);
            }}
        />
        <FormError name={id} component="div" />
    </FormGroup>
);

// For some reason, styled components breaks formik's "as select"
// so we use onChange event
export const SeparatorPicker = ({
    id,
    title,
    setValue,
}: {
    id: string;
    title: string;
    setValue: (value: string) => void;
}) => (
    <FormGroup key={id}>
        <Label for={id}>
            <strong>{title}</strong>
        </Label>
        <InputField
            as="select"
            name={id}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setValue(event.target.value)
            }
        >
            <option value=";">; (semicolon)</option>
            <option value=",">, (comma)</option>
        </InputField>
    </FormGroup>
);

export const NumberPicker = ({
    id,
    title,
    description,
}: {
    id: string;
    title: string;
    description?: string;
}) => (
    <FormGroup key={id}>
        <Label for={id} className="mb-0">
            <strong>{title}</strong>
        </Label>
        {description && <FormText className="mt-0">{description}</FormText>}
        <InputField type="number" name={id} />
        <FormError name={id} component="div" />
    </FormGroup>
);

export const ColumnPicker = ({
    id,
    title,
    model,
    entity,
    setParams,
}: {
    id: string;
    title: string;
    model: Model;
    entity: EntitySpec;
    setParams: (node: tree.Node<any>) => void;
}) => (
    <FormGroup key={id}>
        <FormNest title={<strong>{title}</strong>}>
            <ModelTree
                model={model}
                rootUrn={entity.getUrn()}
                onChangeGraph={(node) => setParams(node)}
            />
        </FormNest>
    </FormGroup>
);

const ErrorsText = styled.p`
    color: ${(props) => props.theme.colors.danger};
    margin-bottom: 4px;
`;

export const ListErrors = <T extends { [key: string]: any }>({
    errors,
}: {
    errors: FormikErrors<T>;
}) => (
    <div className="mt-2">
        {Object.keys(errors).map((key) => (
            <ErrorsText key={key}>
                {`${key}: ${(errors as { [key: string]: any })[key]}`}
            </ErrorsText>
        ))}
    </div>
);

const truncate = (str: string, max: number): string => {
    return str.length > max ? str.substr(0, max - 1) + "..." : str;
};

const valueCss = css`
    padding: 3px;
    border-radius: 5px;
    color: ${(props) => props.theme.colors.white};
    background-color: ${(props) => props.theme.colors.inputBackground};
`;

const Value = styled.strong`
    ${valueCss}
`;

const NotValue = styled.span`
    ${valueCss}
`;

export const renderAny = (value: DataAny): React.ReactNode => {
    if (value === undefined) {
        return <NotValue>(unset)</NotValue>;
    }
    if (value === null) {
        return <NotValue>(null)</NotValue>;
    }
    if (typeof value === "string") {
        if (!value) return <NotValue>(empty)</NotValue>;
        return <Value>{truncate(value, printMaxLength)}</Value>;
    }
    if (typeof value === "object") {
        if (Array.isArray(value)) {
            return value.length ? (
                <Value>{`${value.length} object(s)`}</Value>
            ) : (
                <NotValue>(empty)</NotValue>
            );
        }
        return <Value>{`{ id: ${(value as DataObject).id} }`}</Value>;
    }

    return <Value>{truncate(value.toString(), printMaxLength)}</Value>;
};

export const TitleAssociation = ({
    entity,
    relation,
    showValue = true,
}: {
    entity: EntitySpec;
    relation: RelationSpec;
    showValue: boolean;
}) => {
    const { values } = useFormikContext();
    const { t } = useTranslation();

    const value = (values as DataObject)[relatedFieldName(relation, entity)];

    const side = relation.getSide(entity.getUrn());
    let makeTitle = null;
    if (side === RelationSide.ManyToMany || side === RelationSide.ManyToOne) {
        makeTitle = (name: string) => t("typeObjects", { name: name });
    } else if (side === RelationSide.OneToMany) {
        makeTitle = (name: string) => t("typeObject", { name: name });
    }

    return makeTitle ? (
        <React.Fragment>
            <span className="mr-3">{makeTitle(entity.getName())}</span>
            {showValue ? renderAny(value) : null}
        </React.Fragment>
    ) : null;
};

export const SubmitButton: React.FC<BasicButtonProps> = (props) => {
    const { t } = useTranslation();
    return (
        <BasicButton
            type="submit"
            variant={props.variant || "primary"}
            disabled={props.disabled}
            {...props}
        >
            {t("Submit")}
        </BasicButton>
    );
};

export const LoadingButton = ({
    loading,
    text,
    loadingText,
    ...props
}: {
    loading: boolean;
    text: string;
    loadingText: string;
} & BasicButtonProps) => {
    const inner = loading ? (
        <span>
            <CircleNotch spin className="mr-2" />
            {loadingText}
        </span>
    ) : (
        <span>{text}</span>
    );
    return (
        <BasicButton
            type="submit"
            variant={props.variant || "primary"}
            disabled={props.disabled}
            {...props}
        >
            {inner}
        </BasicButton>
    );
};

export const attributeInputType = (attribute: Attribute): string => {
    switch (attribute.type) {
        case TypeOfAttribute.String:
            return "text";
        case TypeOfAttribute.Integer:
        case TypeOfAttribute.Real:
            return "text";
        case TypeOfAttribute.Timestamp:
            return "datetime";
        case TypeOfAttribute.Bool:
            return "checkbox";
    }
};

export const attributeFormGroup = (
    attribute: Attribute,
    index: number
): React.ReactElement => {
    return (
        <FormGroup key={index}>
            <Label for={attribute.id} className="mb-0">
                <strong>{attribute.name}</strong>
            </Label>
            <FormText className="mt-0">{attribute.description}</FormText>
            <InputField
                type={attributeInputType(attribute)}
                name={attribute.id}
                autoComplete="off"
            />
            <FormError name={attribute.id} component="div" />
        </FormGroup>
    );
};

export const attributeFormGroups = (
    entity: EntitySpec
): React.ReactElement[] => {
    const required = entity
        .getCustomAttributes()
        .filter((attribute) => attribute.required)
        .map(attributeFormGroup);

    const optional = entity
        .getCustomAttributes()
        .filter((attribute) => !attribute.required)
        .map(attributeFormGroup);

    if (optional.length > 0)
        required.push(
            <FormNest key="optional" title="Optional Attributes">
                {optional}
            </FormNest>
        );
    return required;
};

export const SingleAssociation = ({
    model,
    resolver,
    entity,
    attributes,
    setValue,
    initial,
}: {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
    attributes: Attribute[];
    setValue: SetValue;
    initial: DataObject | null;
}) => {
    const { t } = useTranslation();
    const [item, setItem] = useState<DataObject | null>(null);

    const change = (item: DataObject | null) => {
        setItem(item);
        setValue(item);
    };

    useEffect(() => {
        if (!initial) return;

        const params = paramsForObjectDisplay(model, entity, {
            id: initial.id,
        });
        fetchWithStatus(resolver, params).then((objectFetch) => {
            if (objectFetch.error) {
                const msg = `failed to fetch "${entity.getName()}" with id ${
                    initial.id
                }: `;
                toastError(msg + objectFetch.error.toString());
                return;
            }
            const objects = objectFetch.response!.getData()![
                entity.getPlural()
            ];
            if (!objects.length) {
                toastError(
                    `"${entity.getName()}" object with id ${
                        initial.id
                    } not found`
                );
                return;
            }
            setItem(objects[0]);
        });
    }, [initial, model, resolver, entity]);

    return (
        <React.Fragment>
            <SingleItemDrop
                entity={entity}
                attributes={attributes}
                onChange={change}
                item={item}
            />
            <Separator />
            <FuzzyPicker
                entity={entity}
                attributes={attributes}
                resolver={resolver}
                onClick={(obj) => change(obj)}
                placeholder={t("searchFor", { name: entity.getName() })}
            />
            <Separator />
            <CreateObjectButton entity={entity} />
        </React.Fragment>
    );
};

const fetchFromInitial = async (
    model: Model,
    resolver: Resolver,
    entity: EntitySpec,
    initial: DataObject[]
): Promise<DataObject[]> => {
    const ids = initial.map((o) => o.id);
    const params = paramsForObjectDisplay(model, entity, { id: { in: ids } });

    const objectFetch = await fetchWithStatus(resolver, params);

    if (objectFetch.error) {
        const msg = `failed to fetch "${entity.getName()}" with ids ${ids}: `;
        throw new Error(msg + objectFetch.error.toString());
    }
    const objects = objectFetch.response!.getData()![entity.getPlural()];
    if (objects.length !== ids.length) {
        throw new Error(
            `some "${entity.getName()}" objects not found: ${ids} != ${objects.map(
                (o) => o.id
            )}`
        );
    }

    return objects;
};

export const MultipleAssociation = ({
    model,
    resolver,
    entity,
    attributes,
    setValue,
    initial,
}: {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
    attributes: Attribute[];
    setValue: SetValue;
    initial: DataObject[] | null;
}) => {
    const { t } = useTranslation();

    const [items, setItems] = useState<Map<number, DataObject>>(new Map());

    const change = (items: Map<number, DataObject>) => {
        setItems(items);
        setValue(Array.from(items.values()));
    };

    const onAdd = (added: DataObject[]) => {
        const after = new Map(items);
        for (const toAdd of added) {
            if (!after.has(toAdd.id)) after.set(toAdd.id, toAdd);
        }
        change(after);
    };

    const onRemove = (item: DataObject) => {
        if (items.has(item.id)) {
            const after = new Map(items);
            after.delete(item.id);
            change(after);
        }
    };

    useEffect(() => {
        if (!initial || !initial.length) return;

        fetchFromInitial(model, resolver, entity, initial)
            .then((objects) => {
                const objectMap: Map<number, DataObject> = new Map(
                    objects.map((o) => [o.id, o])
                );
                setItems(objectMap);
            })
            .catch((err) => toastError(err));
    }, [initial, model, resolver, entity]);

    return (
        <React.Fragment>
            <MultiItemDrop
                key={entity.getUrn()}
                entity={entity}
                attributes={attributes}
                onAdd={onAdd}
                onRemove={onRemove}
                items={Array.from(items.values())}
            />
            <Separator />
            <FuzzyPicker
                entity={entity}
                attributes={attributes}
                resolver={resolver}
                onClick={(obj) => onAdd([obj])}
                placeholder={t("searchFor", { name: entity.getName() })}
            />
            <Separator />
            <CreateObjectButton entity={entity} />
        </React.Fragment>
    );
};

const fetchFromParentId = async (
    model: Model,
    resolver: Resolver,
    entity: EntitySpec,
    parentId: number,
    parentFieldName: string
): Promise<DataObject[]> => {
    const params = paramsForObjectDisplay(model, entity, {
        [`${parentFieldName}`]: parentId,
    });

    const objectFetch = await fetchWithStatus(resolver, params);

    if (objectFetch.error) {
        const msg = `failed to fetch "${entity.getName()}" with ${parentFieldName} ${parentId}: `;
        throw new Error(msg + objectFetch.error.toString());
    }
    const objects = objectFetch.response!.getData()![entity.getPlural()];

    return objects;
};

export const HasManyAssociation = ({
    model,
    resolver,
    entity,
    relation,
    attributes,
    setValue,
    initial,
    parentId,
}: {
    model: Model;
    resolver: Resolver;
    entity: EntitySpec;
    relation: RelationSpec;
    attributes: Attribute[];
    setValue: SetValue;
    initial: DataObject[] | null;
    parentId?: number;
}) => {
    const { t } = useTranslation();

    const [items, setItems] = useState<Map<number, DataObject>>(new Map());
    const [forceUpdate, setForceUpdate] = useState<number>(0);

    const change = (items: Map<number, DataObject>) => {
        setItems(items);
        setValue(Array.from(items.values()));
    };

    const onAdd = (added: DataObject[]) => {
        const after = new Map(items);
        // objects are partial and don't have an id, so generate
        for (const toAdd of added) {
            // const partialId = getPartialID(entity, toAdd);
            after.set(0, toAdd);
        }
        change(after);
    };

    const onRemove = (item: DataObject) => {
        // If we're editing, remove immediately
        if (item.id) {
            const operation = t("delete", { name: entity.getName() });
            resolver
                .deleteObject(entity, item)
                .then((response) => {
                    if (response.getError()) throw response.getError();
                    toastSuccess(t("wasSuccessful", { operation }));
                    setForceUpdate(forceUpdate + 1);
                })
                .catch((err) => {
                    console.error("failed to submit", err);
                    toastError(
                        t("failedWith", {
                            operation,
                            error: err,
                        })
                    );
                });
            return;
        }

        // const partialId = getPartialID(entity, item);
        if (items.has(0)) {
            const after = new Map(items);
            after.delete(0);
            change(after);
        }
    };

    const rFilter = new RelationFilter(entity);
    rFilter.addToBlacklist(relation.getUrn());

    useEffect(() => {
        if (!parentId) return;

        const idFieldName =
            relatedFieldName(
                relation,
                model.getRelatedEntity(entity.getUrn(), relation.getUrn())!
            ) + "_id";
        fetchFromParentId(model, resolver, entity, parentId, idFieldName)
            .then((objects) => {
                const objectMap: Map<number, DataObject> = new Map(
                    objects.map((o) => [o.id, o])
                );
                setItems(objectMap);
            })
            .catch((err) => toastError(err));
    }, [initial, model, resolver, entity, relation, parentId, forceUpdate]);

    const parentFieldName = relatedFieldName(
        relation,
        model.getRelatedEntity(entity.getUrn(), relation.getUrn())!
    );

    return (
        <React.Fragment>
            <MultiItemEdit
                key={entity.getUrn()}
                entity={entity}
                attributes={attributes.filter((attr) => attr.id !== ID_FIELD)}
                onAdd={onAdd}
                onRemove={onRemove}
                items={Array.from(items.values())}
                relationFilter={rFilter}
                forceUpdate={() => setForceUpdate(forceUpdate + 1)}
            />
            <Separator />
            <InlineCreateObjectButton
                entity={entity}
                onCreate={(object) => onAdd([object])}
                relationFilter={rFilter}
                parentId={parentId}
                parentFieldName={parentFieldName}
                forceUpdate={() => setForceUpdate(forceUpdate + 1)}
            />
            <Separator />
        </React.Fragment>
    );
};

export const Association = ({
    entity,
    relation,
    setValue,
    initial,
    parentId,
}: {
    entity: EntitySpec;
    relation: RelationSpec;
    setValue: SetValue;
    initial: DataObject | DataObject[] | null;
    parentId?: number;
}) => {
    const { model, resolver } = useEntityRelation();

    if (!model || !resolver) return null;

    const customAttributes = entity
        .getCustomAttributes()
        .filter(
            (attribute, index) => (attribute.unique && index <= 1) || index <= 1
        );

    const attributes = [CommonAttributes[0], ...customAttributes];

    const side = relation.getSide(entity.getUrn());

    if (side === RelationSide.ManyToMany) {
        return (
            <MultipleAssociation
                key={entity.getUrn()}
                model={model}
                resolver={resolver}
                entity={entity}
                attributes={attributes}
                setValue={setValue}
                initial={initial as DataObject[] | null}
            />
        );
    }

    if (side === RelationSide.ManyToOne) {
        return (
            <HasManyAssociation
                key={entity.getUrn()}
                model={model}
                resolver={resolver}
                entity={entity}
                relation={relation}
                attributes={attributes}
                setValue={setValue}
                initial={initial as DataObject[] | null}
                parentId={parentId}
            />
        );
    }

    if (side === RelationSide.OneToMany) {
        return (
            <SingleAssociation
                key={entity.getUrn()}
                model={model}
                resolver={resolver}
                entity={entity}
                attributes={attributes}
                setValue={setValue}
                initial={initial as DataObject | null}
            />
        );
    }

    return null;
};

const CreateObjectButton = ({
    entity,
}: BasicButtonProps & {
    entity: EntitySpec;
}) => {
    // Access the tabsAPI to open new tabs
    const { tabsAPI } = useTabs();
    const { t } = useTranslation();
    const title = t("createNew", { name: entity.getName() });

    return (
        <BasicButton
            onClick={() =>
                tabsAPI.createNew(createSpecificObject(entity, title))
            }
            variant="primary"
        >
            <span>
                <PlusCircle className="mr-2" />
                {title}
            </span>
        </BasicButton>
    );
};

const InlineCreateObjectButton = ({
    entity,
    onCreate,
    relationFilter,
    parentId,
    parentFieldName,
    forceUpdate,
}: BasicButtonProps & {
    entity: EntitySpec;
    onCreate: (object: DataObject) => void;
    relationFilter?: RelationFilter;
    parentId?: number;
    parentFieldName: string;
    forceUpdate: () => void;
}) => {
    // Access the tabsAPI to open new tabs
    const { tabsAPI } = useTabs();
    const { t } = useTranslation();
    const title = t("add", { name: entity.getName() });

    // If we have a parentId, then we're editing the object
    // so mutations are performed immediately, and not on form
    // submission.
    const onClick = parentId
        ? () =>
              tabsAPI.openModal(
                  createObjectInModal(entity.getUrn(), title, {
                      relationFilter,
                      initial: {
                          id: 0,
                          [`${parentFieldName}`]: { id: parentId },
                      },
                      notify: true,
                      onDone: forceUpdate,
                  })
              )
        : () =>
              tabsAPI.openModal(
                  createObjectInModal(entity.getUrn(), title, {
                      onCreate,
                      relationFilter,
                      notify: false,
                  })
              );

    return (
        <BasicButton onClick={onClick} variant="primary">
            <span>
                <PlusCircle className="mr-2" />
                {title}
            </span>
        </BasicButton>
    );
};

const RelationFormGroup = ({
    entity,
    relation,
    setValue,
    initial,
    parentId,
}: {
    entity: EntitySpec;
    relation: RelationSpec;
    setValue: SetValue;
    initial: DataObject | DataObject[] | null;
    parentId?: number;
}) => (
    <FormNest
        title={
            <TitleAssociation
                entity={entity}
                relation={relation}
                showValue={
                    relation.getSide(entity.getUrn()) !== RelationSide.ManyToOne
                }
            />
        }
        initial={relation.getSide(entity.getUrn()) === RelationSide.ManyToOne}
    >
        <FormGroup>
            <Association
                entity={entity}
                relation={relation}
                setValue={setValue}
                initial={initial}
                parentId={parentId}
            />
        </FormGroup>
    </FormNest>
);

export const RelationForm = ({
    entity,
    relations,
    model,
    setFieldValue,
    initial,
    parentId,
}: {
    entity: EntitySpec;
    relations: RelationSpec[];
    model: Model;
    setFieldValue: (field: string, value: any) => void;
    initial: DataObject;
    parentId?: number;
}) => {
    return (
        <React.Fragment>
            {relations
                .map((relation): [EntitySpec, RelationSpec] => [
                    model.getRelatedEntity(entity.getUrn(), relation.getUrn())!,
                    relation,
                ])
                .map(([other, relation]) => (
                    <RelationFormGroup
                        key={other.getUrn()}
                        entity={other}
                        relation={relation}
                        setValue={(value) =>
                            setFieldValue(
                                relatedFieldName(relation, other),
                                value
                            )
                        }
                        initial={
                            initial[relatedFieldName(relation, other)] as
                                | DataObject
                                | DataObject[]
                        }
                        parentId={parentId}
                    />
                ))}
        </React.Fragment>
    );
};

/**
 * Relation filters are used to:
 * - show relation that would otherwise be hidden
 * - hide relation forms that would otherwise be shown
 *
 * By default, relation forms for filling in objects of an entity type
 * in a OneToMany side of a relationship are hidden.
 * Forms for objects of entity types in other relation sides are shown
 * by default.
 *
 * Blacklist supersedes whitelist.
 */
export class RelationFilter {
    private entity: EntitySpec;
    // List of relation URNs to show that would be hidden by default.
    private whitelist: Set<string>;
    // List of relation URNs to hide that would be shown by default.
    private blacklist: Set<string>;
    // Block all relations
    private blockAll: boolean;

    constructor(
        entity: EntitySpec,
        whitelist?: string[],
        blacklist?: string[]
    ) {
        this.entity = entity;
        this.whitelist = new Set(whitelist || []);
        this.blacklist = new Set(blacklist || []);
        this.blockAll = false;
    }

    public clone = (): RelationFilter => {
        const filter = new RelationFilter(
            this.entity,
            Array.from(this.whitelist),
            Array.from(this.blacklist)
        );
        filter.setBlockAll(this.blockAll);
        return filter;
    };

    public pass = (relation: RelationSpec): boolean => {
        if (this.blockAll) return false;

        const urn = relation.getUrn();

        if (this.blacklist.has(urn)) return false;
        if (this.whitelist.has(urn)) return true;
        return (
            relation.getSide(this.entity.getUrn()) !== RelationSide.OneToMany
        );
    };

    public addToWhitelist = (urn: string) => {
        this.whitelist.add(urn);
    };

    public addToBlacklist = (urn: string) => {
        this.blacklist.add(urn);
    };

    public setBlockAll = (block: boolean) => {
        this.blockAll = block;
    };
}
