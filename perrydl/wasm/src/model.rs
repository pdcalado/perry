use crate::common::UniqueConstraint;
use crate::entity::Entity;
use crate::error::{Error, Result};
use crate::relation::{Cardinality, Relation};
use crate::sql;
use crate::urn;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Deserialize, Serialize)]
pub struct SerdeModel {
    tenant: String,
    entities: Vec<Entity>,
    relations: Vec<Relation>,
}

/// Data model of a specific tenant
#[derive(Debug)]
pub struct Model {
    tenant: String,
    entities: Vec<Entity>,
    relations: Vec<Relation>,
    by_urn: BTreeMap<String, usize>,
    by_singular: BTreeMap<String, usize>,
    by_plural: BTreeMap<String, usize>,
    by_urn_relations: BTreeMap<String, usize>,
}

impl Model {
    pub fn new(serde_model: SerdeModel) -> Result<Model> {
        let entities = serde_model.entities;
        let relations = serde_model.relations;

        // Index entities by urn.
        let by_urn: BTreeMap<String, usize> = entities
            .iter()
            .enumerate()
            .map(|(i, ent)| (ent.urn.clone(), i))
            .collect();

        let by_singular: BTreeMap<String, usize> = entities
            .iter()
            .enumerate()
            .map(|(i, ent)| (ent.singular.clone(), i))
            .collect();

        let by_plural: BTreeMap<String, usize> = entities
            .iter()
            .enumerate()
            .map(|(i, ent)| (ent.plural.clone(), i))
            .collect();

        let by_urn_relations: BTreeMap<String, usize> = relations
            .iter()
            .enumerate()
            .map(|(i, rel)| (rel.urn.clone(), i))
            .collect();

        let model = Model {
            tenant: serde_model.tenant,
            relations,
            entities,
            by_urn,
            by_singular,
            by_plural,
            by_urn_relations,
        };

        // perform validations
        model.validate()?;

        Ok(model)
    }

    fn relations_of_entity(&self, urn: &str, cardinality: Cardinality) -> Vec<usize> {
        self.relations
            .iter()
            .enumerate()
            .filter(|(_, rel)| rel.is_destination(urn, cardinality))
            .map(|(i, _)| i)
            .collect()
    }

    /// Validates:
    /// * each entity and relation independently.
    /// * that entities and relations basenames do not collide.
    /// * that each relation has a valid origin/destination entity.
    /// * that an entity is at most once a destination in a OneToMany relation.
    pub fn validate(&self) -> Result<()> {
        self.entities
            .iter()
            .map(|ent| ent.validate())
            .collect::<Result<Vec<()>>>()?;

        self.relations
            .iter()
            .map(|rel| rel.validate())
            .collect::<Result<Vec<()>>>()?;

        // Basenames cannot collide among entities and relations
        let mut basenames: BTreeSet<&str> = BTreeSet::new();
        self.entities
            .iter()
            .map(|ent| urn::basename(&ent.urn))
            .chain(self.relations.iter().map(|rel| urn::basename(&rel.urn)))
            .find(|name| !basenames.insert(name))
            .map(|name| {
                Err(Error::new(&format!(
                    "basename '{}' occurs more than once",
                    name
                )))
            })
            .unwrap_or(Ok(()))?;

        // Validate origins and destinations of relations
        self.relations
            .iter()
            .find(|rel| {
                !self.by_urn.contains_key(&rel.origin)
                    || !self.by_urn.contains_key(&rel.destination)
            })
            .map(|rel| {
                Err(Error::new(&format!(
                    "relation '{}' origin or destination not found",
                    rel.urn
                )))
            })
            .unwrap_or(Ok(()))?;

        // Validate that all relations exist in all entities' UniqueConstraints
        for entity in &self.entities {
            for uc in &entity.unique_constraints {
                for urn in &uc.relations {
                    let relation = self.relations.iter().find(|rel| rel.urn == *urn);
                    if relation.is_none() {
                        return Err(Error::new(&format!(
                            "in entity '{}', in unique constraint, relation '{}' not found",
                            entity.urn, urn
                        )));
                    }

                    let relation = relation.unwrap();
                    let is_m2m = relation.cardinality == Cardinality::ManyToMany;
                    let is_m2o = relation.cardinality == Cardinality::OneToMany
                        && relation.origin == entity.urn;
                    if is_m2m || is_m2o {
                        return Err(Error::new(&format!(
                            "in entity '{}': unique constraints can only use OneToMany relations with the entity as the destination", entity.urn
                        )));
                    }
                }
            }
        }

        Ok(())
    }

    /// Get name of attribute who is a foreign key of a relation.
    ///
    /// # Panics
    /// Panics if the relation_urn does not exist.
    fn foreign_key_name(&self, relation_urn: &str, destination: bool) -> String {
        let index = *self.by_urn_relations.get(relation_urn).unwrap();
        let relation = &self.relations[index];
        let (origin, dest) = self.entities_of_relation(relation);
        if destination {
            format!("{}_id", dest.singular)
        } else {
            format!("{}_id", origin.singular)
        }
    }

    fn unique_constraint_attributes(&self, uc: &UniqueConstraint) -> Vec<String> {
        // Convert each unique constraint field to a column name
        let attributes: Vec<&str> = uc.attributes.iter().map(|s| s.as_str()).collect();

        // Consider only OneToMany relations
        let relations: Vec<String> = uc
            .relations
            .iter()
            .map(|urn| self.foreign_key_name(urn, false))
            .collect();

        attributes
            .iter()
            .map(|s| s.to_string())
            .chain(relations.into_iter())
            .collect()
    }

    /// List the unique attributes of a table.
    /// Returns the attributes that are either flagged as unique
    /// or that participate in a unique constraint.
    pub fn table_unique_attributes(&self, name: &str) -> Option<Vec<String>> {
        let opt_index = self.by_plural.get(name);
        match opt_index {
            None => None,
            Some(index) => Some(
                self.entities[*index]
                    .unique_constraints
                    .iter()
                    .flat_map(|uc| self.unique_constraint_attributes(uc))
                    .chain(
                        self.entities[*index]
                            .attributes
                            .iter()
                            .filter(|attr| attr.unique)
                            .map(|attr| attr.id.clone()),
                    )
                    .collect(),
            ),
        }
    }

    fn entity_as_sql(&self, entity_ref: &Entity) -> Option<Vec<String>> {
        let mut table = entity_ref.as_sql_table();
        let trigger = entity_ref.as_sql_trigger();

        // Push unique constraints
        entity_ref.unique_constraints.iter().for_each(|uc| {
            table.unique_constraints.push(sql::UniqueConstraint::new(
                self.unique_constraint_attributes(uc),
            ));
        });

        // Entity as origin of OneToMany does not impact SQL table.
        // Entity as origin/destination of ManyToMany does not impact SQL table.

        // Entity as destination of OneToMany does impact.
        // The check must be part of validate() method.
        let related = self.relations_of_entity(&entity_ref.urn, Cardinality::OneToMany);

        if related.is_empty() {
            return Some(vec![table.to_string(), trigger.to_string()]);
        }

        for index in related {
            let relation = &self.relations[index];
            // Safe to unwrap since validation is assumed.
            let origin_index = *self.by_urn.get(&relation.origin).unwrap();
            let origin_entity = &self.entities[origin_index];
            let column_name = format!("{}_id", origin_entity.singular);

            table.columns.push(sql::Column {
                name: column_name.clone(),
                ty: sql::Type::Integer,
                not_null: true,
                ..Default::default()
            });

            table.foreign_keys.push(sql::ForeignKey {
                key: column_name,
                table_name: origin_entity.plural.clone(),
                table_key: sql::BASE_ID.to_owned(),
                on_delete_cascade: true,
            });
        }

        Some(vec![table.to_string(), trigger.to_string()])
    }

    fn entities_of_relation(&self, relation_ref: &Relation) -> (&Entity, &Entity) {
        (
            &self.entities[*self.by_urn.get(&relation_ref.origin).unwrap()],
            &self.entities[*self.by_urn.get(&relation_ref.destination).unwrap()],
        )
    }

    fn relation_table_name(&self, origin: &Entity, destination: &Entity) -> String {
        format!("{}_{}", origin.singular, destination.plural)
    }

    fn relation_as_sql(&self, relation_ref: &Relation) -> Option<Vec<String>> {
        // Nothing to be done for OneToMany relations
        if relation_ref.cardinality == Cardinality::OneToMany {
            return None;
        }

        let (origin, destination) = self.entities_of_relation(relation_ref);

        let origin_key = format!("{}_id", origin.singular);
        let destination_key = format!("{}_id", destination.singular);

        // Create table with base columns
        let mut table = sql::Table {
            name: self.relation_table_name(origin, destination),
            columns: vec![
                sql::Column {
                    name: origin_key.clone(),
                    ty: sql::Type::Integer,
                    not_null: true,
                    ..Default::default()
                },
                sql::Column {
                    name: destination_key.clone(),
                    ty: sql::Type::Integer,
                    not_null: true,
                    ..Default::default()
                },
            ],
            foreign_keys: vec![
                sql::ForeignKey {
                    key: origin_key,
                    table_name: origin.plural.to_owned(),
                    table_key: sql::BASE_ID.to_owned(),
                    on_delete_cascade: true,
                },
                sql::ForeignKey {
                    key: destination_key,
                    table_name: destination.plural.to_owned(),
                    table_key: sql::BASE_ID.to_owned(),
                    on_delete_cascade: true,
                },
            ],
            unique_constraints: vec![],
        };

        // Add attributes to table
        relation_ref
            .attributes
            .iter()
            .for_each(|attr| table.columns.push(attr.clone().into()));

        Some(vec![table.to_string()])
    }

    pub fn get_singular(&self, text: &str) -> Result<&str> {
        let index = self
            .by_plural
            .get(text)
            .or(self.by_singular.get(text))
            .ok_or(Error::new(&format!("plural of '{}' not found", text)))?;
        Ok(&self.entities[*index].singular)
    }

    pub fn get_plural(&self, text: &str) -> Result<&str> {
        let index = self
            .by_singular
            .get(text)
            .or(self.by_plural.get(text))
            .ok_or(Error::new(&format!("singular of '{}' not found", text)))?;
        Ok(&self.entities[*index].plural)
    }

    pub fn is_relation_table(&self, name: &str) -> bool {
        self.relations
            .iter()
            .map(|rel| self.entities_of_relation(rel))
            .any(|(a, b)| self.relation_table_name(a, b) == name)
    }

    pub fn table_names(&self) -> Vec<String> {
        let relation_tables = self
            .relations
            .iter()
            .filter(|rel| rel.cardinality == Cardinality::ManyToMany)
            .map(|rel| self.entities_of_relation(rel))
            .map(|(orig, dest)| self.relation_table_name(orig, dest));

        self.entities
            .iter()
            .map(|ent| ent.as_sql_table_name().to_owned())
            .chain(relation_tables)
            .collect()
    }
}

impl sql::GenerateSql for Model {
    fn generate_sql(&self) -> Vec<String> {
        self.entities
            .iter()
            .map(|ent| self.entity_as_sql(ent))
            .chain(self.relations.iter().map(|rel| self.relation_as_sql(rel)))
            .filter(|opt| opt.is_some())
            .map(|opt| opt.unwrap())
            .flatten()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_serde_model() -> Result<SerdeModel> {
        let raw = r#"{
            "tenant": "sampleperry",
            "entities": [],
            "relations": []
        }"#;
        let smodel = serde_json::from_slice(raw.as_bytes())?;
        Ok(smodel)
    }

    #[test]
    fn other_serde_model() {
        let raw = r#"{
            "id": 1,
            "rev": 1,
            "created_at": 1592913585000,
            "updated_at": 1592913585000,
            "tenant": "sampleperry",
            "entities": [
                {
                    "id": 1,
                    "urn": "sampleperry:part",
                    "singular": "part",
                    "plural": "parts",
                    "name": "Auto Part",
                    "description": "An electric or mechanical part",
                    "visibility": "Tenant",
                    "attributes": [
                        {
                            "id": "label",
                            "name": "Label",
                            "description": "Unique label of the item",
                            "required": true,
                            "unique": true,
                            "type": "string"
                        },
                        {
                            "id": "description",
                            "name": "Description",
                            "description": "Description of the item",
                            "type": "string"
                        },
                        {
                            "id": "manufacturer",
                            "name": "Manufacturer",
                            "description": "Manufacturer of the item",
                            "type": "string"
                        },
                        {
                            "id": "barcode",
                            "name": "Barcode",
                            "description": "Barcode notes",
                            "type": "string"
                        }
                    ]
                },
                {
                    "id": 2,
                    "urn": "sampleperry:category",
                    "name": "Category",
                    "singular": "category",
                    "plural": "categories",
                    "description": "Category of parts",
                    "visibility": "Tenant",
                    "attributes": [
                        {
                            "id": "name",
                            "name": "Name",
                            "description": "Name of the category",
                            "required": true,
                            "unique": true,
                            "type": "string"
                        },
                        {
                            "id": "description",
                            "name": "Description",
                            "description": "Description of the category",
                            "type": "string"
                        }
                    ]
                },
                {
                    "id": 3,
                    "urn": "sampleperry:price",
                    "singular": "price",
                    "plural": "prices",
                    "name": "Price",
                    "description": "A part's price",
                    "visibility": "Tenant",
                    "attributes": [
                        {
                            "id": "value",
                            "name": "Value",
                            "required": true,
                            "type": "real"
                        }
                    ]
                },
                {
                    "id": 4,
                    "urn": "sampleperry:storage_site",
                    "singular": "storage_site",
                    "plural": "storage_sites",
                    "name": "Storage Site",
                    "description": "A storage site for stock",
                    "visibility": "Tenant",
                    "attributes": [
                        {
                            "id": "name",
                            "name": "Name",
                            "description": "Name of the storage site",
                            "required": true,
                            "type": "string",
                            "unique": true
                        },
                        {
                            "id": "contact_person",
                            "name": "Contact Person",
                            "description": "Name of the person to contact on site",
                            "required": true,
                            "type": "string"
                        },
                        {
                            "id": "phone_number",
                            "name": "Phone Number",
                            "description": "Contact phone number of the site",
                            "required": true,
                            "type": "string"
                        },
                        {
                            "id": "email_address",
                            "name": "Email Address",
                            "description": "Contact email address of the site",
                            "required": true,
                            "type": "string"
                        }
                    ]
                },
                {
                    "id": 5,
                    "urn": "sampleperry:storage_area",
                    "singular": "storage_area",
                    "plural": "storage_areas",
                    "name": "Storage Area",
                    "description": "A storage area for stock",
                    "visibility": "Tenant",
                    "attributes": [
                        {
                            "id": "name",
                            "name": "Name",
                            "description": "Name of the storage area",
                            "required": true,
                            "type": "string",
                            "unique": true
                        }
                    ]
                },
                {
                    "id": 6,
                    "urn": "sampleperry:stock_item_config",
                    "singular": "stock_item_config",
                    "plural": "stock_item_configs",
                    "name": "Stock Item Configuration",
                    "description": "Configuration for a stock item",
                    "visibility": "Tenant",
                    "attributes": [
                        {
                            "id": "minimum",
                            "name": "Minimum Stock",
                            "description": "Minimum items that should be in stock",
                            "type": "integer"
                        },
                        {
                            "id": "maximum",
                            "name": "Maximum Stock",
                            "description": "Maximum items that should be in stock",
                            "type": "integer"
                        },
                        {
                            "id": "replenishment",
                            "name": "Replenishment",
                            "description": "Replenishment of items when minimum is reached",
                            "type": "integer"
                        }
                    ],
                    "unique_constraints": [
                        {
                            "attributes": [],
                            "relations": ["sampleperry:site_has_stock_config", "sampleperry:item_has_stock_config"]
                        }
                    ]
                },
                {
                    "id": 7,
                    "urn": "sampleperry:stock_entry",
                    "singular": "stock_entry",
                    "plural": "stock_entries",
                    "name": "Stock Entry",
                    "description": "An entry in the stock with quantity of a part",
                    "visibility": "Tenant",
                    "attributes": [
                        {
                            "id": "quantity",
                            "name": "Quantity",
                            "description": "Amount of items in stock",
                            "type": "integer"
                        }
                    ],
                    "unique_constraints": [
                        {
                            "attributes": [],
                            "relations": ["sampleperry:area_has_stock_entry", "sampleperry:item_has_stock_entry"]
                        }
                    ]
                }
            ],
            "relations": [
                {
                    "id": 1,
                    "urn": "sampleperry:categorizedby",
                    "name": "Categorized By",
                    "description": "Relates parts with categories",
                    "attributes": [],
                    "visibility": "Tenant",
                    "origin": "sampleperry:part",
                    "destination": "sampleperry:category",
                    "cardinality": "ManyToMany"
                },
                {
                    "id": 2,
                    "urn": "sampleperry:pricedby",
                    "name": "Priced By",
                    "description": "Priced of a part relation",
                    "visibility": "Tenant",
                    "origin": "sampleperry:part",
                    "destination": "sampleperry:price",
                    "cardinality": "OneToMany",
                    "attributes": []
                },
                {
                    "id": 3,
                    "urn": "sampleperry:item_has_stock_config",
                    "name": "Item Has Stock Config",
                    "description": "Relation between a part and stock configuration",
                    "visibility": "Tenant",
                    "origin": "sampleperry:part",
                    "destination": "sampleperry:stock_item_config",
                    "cardinality": "OneToMany",
                    "attributes": []
                },
                {
                    "id": 4,
                    "urn": "sampleperry:site_has_stock_config",
                    "name": "Stock Config For Site",
                    "description": "Relation between stock configuration and the storage site",
                    "visibility": "Tenant",
                    "origin": "sampleperry:storage_site",
                    "destination": "sampleperry:stock_item_config",
                    "cardinality": "OneToMany",
                    "attributes": []
                },
                {
                    "id": 5,
                    "urn": "sampleperry:site_has_areas",
                    "name": "Storage Site Has Area",
                    "description": "Relation between storage site and storage area",
                    "visibility": "Tenant",
                    "origin": "sampleperry:storage_site",
                    "destination": "sampleperry:storage_area",
                    "cardinality": "OneToMany",
                    "attributes": []
                },
                {
                    "id": 6,
                    "urn": "sampleperry:item_has_stock_entry",
                    "name": "Part Has Stock Entry",
                    "description": "Relation between part and stock entry",
                    "visibility": "Tenant",
                    "origin": "sampleperry:part",
                    "destination": "sampleperry:stock_entry",
                    "cardinality": "OneToMany",
                    "attributes": []
                },
                {
                    "id": 7,
                    "urn": "sampleperry:area_has_stock_entry",
                    "name": "Stock Entry Has Storage Area ",
                    "description": "Relation between storage area and stock entry",
                    "visibility": "Tenant",
                    "origin": "sampleperry:storage_area",
                    "destination": "sampleperry:stock_entry",
                    "cardinality": "OneToMany",
                    "attributes": []
                }
            ]
        }"#;
        let smodel: SerdeModel = serde_json::from_slice(raw.as_bytes()).unwrap();
        let model = Model::new(smodel).unwrap();
        use crate::sql::GenerateSql;
        assert_eq!(model.generate_sql().join("\n"), "CREATE TABLE parts(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, label TEXT UNIQUE NOT NULL, description TEXT, manufacturer TEXT, barcode TEXT);\nCREATE TRIGGER parts_updated_at AFTER UPDATE ON parts WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE parts SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE categories(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, name TEXT UNIQUE NOT NULL, description TEXT);\nCREATE TRIGGER categories_updated_at AFTER UPDATE ON categories WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE prices(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, value REAL NOT NULL, part_id INTEGER NOT NULL, FOREIGN KEY (part_id) REFERENCES parts (id) ON DELETE CASCADE);\nCREATE TRIGGER prices_updated_at AFTER UPDATE ON prices WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE prices SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE storage_sites(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, name TEXT UNIQUE NOT NULL, contact_person TEXT NOT NULL, phone_number TEXT NOT NULL, email_address TEXT NOT NULL);\nCREATE TRIGGER storage_sites_updated_at AFTER UPDATE ON storage_sites WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE storage_sites SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE storage_areas(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, name TEXT UNIQUE NOT NULL, storage_site_id INTEGER NOT NULL, FOREIGN KEY (storage_site_id) REFERENCES storage_sites (id) ON DELETE CASCADE);\nCREATE TRIGGER storage_areas_updated_at AFTER UPDATE ON storage_areas WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE storage_areas SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE stock_item_configs(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, minimum INTEGER, maximum INTEGER, replenishment INTEGER, part_id INTEGER NOT NULL, storage_site_id INTEGER NOT NULL, FOREIGN KEY (part_id) REFERENCES parts (id) ON DELETE CASCADE, FOREIGN KEY (storage_site_id) REFERENCES storage_sites (id) ON DELETE CASCADE, UNIQUE (storage_site_id, part_id));\nCREATE TRIGGER stock_item_configs_updated_at AFTER UPDATE ON stock_item_configs WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE stock_item_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE stock_entries(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, quantity INTEGER, part_id INTEGER NOT NULL, storage_area_id INTEGER NOT NULL, FOREIGN KEY (part_id) REFERENCES parts (id) ON DELETE CASCADE, FOREIGN KEY (storage_area_id) REFERENCES storage_areas (id) ON DELETE CASCADE, UNIQUE (storage_area_id, part_id));\nCREATE TRIGGER stock_entries_updated_at AFTER UPDATE ON stock_entries WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE stock_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE part_categories(part_id INTEGER NOT NULL, category_id INTEGER NOT NULL, FOREIGN KEY (part_id) REFERENCES parts (id) ON DELETE CASCADE, FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE);");
        assert_eq!(
            model.table_unique_attributes("parts"),
            Some(vec!["label".into()])
        );
        assert_eq!(
            model.table_unique_attributes("stock_item_configs"),
            Some(vec!["storage_site_id".into(), "part_id".into()])
        );
    }

    fn part_entity() -> Entity {
        serde_json::from_str(
            r#"{
            "id": 1,
            "urn": "sampleperry:part",
            "singular": "part",
            "plural": "parts",
            "name": "Part",
            "description": "A part",
            "visibility": "Tenant",
            "attributes": [
                {
                    "id": "label",
                    "name": "Label",
                    "required": true,
                    "unique": true,
                    "type": "string"
                },
                {
                    "id": "stock",
                    "name": "Stock Units",
                    "type": "integer"
                }
            ]
        }"#,
        )
        .unwrap()
    }

    fn category_entity() -> Entity {
        serde_json::from_str(
            r#"{
            "id": 2,
            "urn": "sampleperry:category",
            "singular": "category",
            "plural": "categories",
            "name": "Category",
            "description": "A category",
            "visibility": "Tenant",
            "attributes": [
                {
                    "id": "name",
                    "name": "Name",
                    "required": true,
                    "unique": true,
                    "type": "string"
                }
            ]
        }"#,
        )
        .unwrap()
    }

    fn price_entity() -> Entity {
        serde_json::from_str(
            r#"{
            "id": 3,
            "urn": "sampleperry:price",
            "singular": "price",
            "plural": "prices",
            "name": "Price",
            "description": "A price",
            "visibility": "Tenant",
            "attributes": [
                {
                    "id": "value",
                    "name": "Value",
                    "required": true,
                    "type": "real"
                }
            ]
        }"#,
        )
        .unwrap()
    }

    fn price_seller_entity() -> Entity {
        serde_json::from_str(
            r#"{
            "id": 4,
            "urn": "sampleperry:price_seller",
            "singular": "price_seller",
            "plural": "prices_seller",
            "name": "Price With Seller",
            "description": "A price with seller",
            "visibility": "Tenant",
            "attributes": [
                {
                    "id": "value",
                    "name": "Value",
                    "required": true,
                    "type": "real"
                },
                {
                    "id": "seller",
                    "name": "Seller",
                    "required": true,
                    "type": "string"
                }
            ],
            "unique_constraints": [
                {
                    "attributes": ["seller"],
                    "relations": ["sampleperry:pricedbyseller"]
                }
            ]
        }"#,
        )
        .unwrap()
    }

    fn categorised_relation() -> Relation {
        serde_json::from_str(
            r#"{
            "id": 5,
            "urn": "sampleperry:categorisedby",
            "name": "Categorised By",
            "description": "Categorization relation",
            "visibility": "Tenant",
            "origin": "sampleperry:part",
            "destination": "sampleperry:category",
            "cardinality": "ManyToMany",
            "attributes": []
        }"#,
        )
        .unwrap()
    }

    fn pricedby_relation() -> Relation {
        serde_json::from_str(
            r#"{
            "id": 6,
            "urn": "sampleperry:pricedby",
            "name": "Priced By",
            "description": "Priced relation",
            "visibility": "Tenant",
            "origin": "sampleperry:part",
            "destination": "sampleperry:price",
            "cardinality": "OneToMany",
            "attributes": []
        }"#,
        )
        .unwrap()
    }

    fn pricedbyseller_relation() -> Relation {
        serde_json::from_str(
            r#"{
            "id": 7,
            "urn": "sampleperry:pricedbyseller",
            "name": "Priced By Seller",
            "description": "Priced by Seller relation",
            "visibility": "Tenant",
            "origin": "sampleperry:part",
            "destination": "sampleperry:price_seller",
            "cardinality": "OneToMany",
            "attributes": []
        }"#,
        )
        .unwrap()
    }

    fn hasprice_relation() -> Relation {
        serde_json::from_str(
            r#"{
            "id": 8,
            "urn": "sampleperry:hasprice",
            "name": "Has Price",
            "description": "Another priced relation",
            "visibility": "Tenant",
            "origin": "sampleperry:category",
            "destination": "sampleperry:price",
            "cardinality": "OneToMany",
            "attributes": []
        }"#,
        )
        .unwrap()
    }

    #[test]
    fn model_new() {
        {
            let smodel = empty_serde_model().expect("model should be serialized ok");
            Model::new(smodel).expect("model should be valid");
        }

        {
            let mut smodel = empty_serde_model().unwrap();
            smodel.entities.push(part_entity());
            Model::new(smodel.clone()).expect("model should be valid");

            smodel.entities.push(part_entity());
            Model::new(smodel).expect_err("model should be invalid with repeated entities");
        }

        {
            let mut smodel = empty_serde_model().unwrap();
            smodel.entities.push(part_entity());
            smodel.entities.push(category_entity());
            Model::new(smodel.clone()).expect("model should be valid with part+category");
            smodel.relations.push(categorised_relation());
            Model::new(smodel.clone())
                .expect("model should be valid with part+category+categorised");
            smodel.entities.push(price_entity());
            Model::new(smodel.clone())
                .expect("model should be valid with part+category+categorised+price");
            smodel.relations.push(pricedby_relation());
            Model::new(smodel.clone())
                .expect("model should be valid with part+category+categorised+price+pricedby");
            smodel.relations.push(hasprice_relation());
            Model::new(smodel).expect(
                "model should be valid with part+category+categorised+price+pricedby+hasprice",
            );
        }

        {
            let mut smodel = empty_serde_model().unwrap();
            smodel.entities.push(part_entity());
            smodel.entities.push(category_entity());
            smodel.relations.push(categorised_relation());
            smodel.entities.push(price_seller_entity());
            Model::new(smodel.clone())
                .expect_err("model should be invalid with part+category+categorised+price_seller with missing relation");
            smodel.relations.push(pricedbyseller_relation());
            Model::new(smodel.clone()).expect(
                "model should be valid with part+category+categorised+price_seller+pricedbyseller",
            );
        }

        {
            let mut smodel = empty_serde_model().unwrap();
            smodel.entities.push(part_entity());
            smodel.relations.push(categorised_relation());
            Model::new(smodel.clone()).expect_err("model should be invalid with part+categorised");
            smodel.entities.push(category_entity());
            Model::new(smodel.clone()).expect("model should now be valid");
            smodel.relations.push(categorised_relation());
            Model::new(smodel.clone())
                .expect_err("model should now be invalid with duplicate relation");
        }
    }

    #[test]
    fn model_to_sql() {
        let mut smodel = empty_serde_model().unwrap();
        smodel.entities.push(part_entity());
        smodel.entities.push(category_entity());
        smodel.relations.push(categorised_relation());
        smodel.entities.push(price_entity());
        smodel.relations.push(pricedby_relation());
        smodel.entities.push(price_seller_entity());
        smodel.relations.push(pricedbyseller_relation());
        let model = Model::new(smodel.clone())
            .expect("model should be valid with part+category+categorised+price+pricedby+price_seller+pricedbyseller");
        use crate::sql::GenerateSql;
        assert_eq!(
            model.generate_sql().join("\n"),
            "CREATE TABLE parts(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, label TEXT UNIQUE NOT NULL, stock INTEGER);\nCREATE TRIGGER parts_updated_at AFTER UPDATE ON parts WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE parts SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE categories(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, name TEXT UNIQUE NOT NULL);\nCREATE TRIGGER categories_updated_at AFTER UPDATE ON categories WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE prices(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, value REAL NOT NULL, part_id INTEGER NOT NULL, FOREIGN KEY (part_id) REFERENCES parts (id) ON DELETE CASCADE);\nCREATE TRIGGER prices_updated_at AFTER UPDATE ON prices WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE prices SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE prices_seller(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, value REAL NOT NULL, seller TEXT NOT NULL, part_id INTEGER NOT NULL, FOREIGN KEY (part_id) REFERENCES parts (id) ON DELETE CASCADE, UNIQUE (seller, part_id));\nCREATE TRIGGER prices_seller_updated_at AFTER UPDATE ON prices_seller WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE prices_seller SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;\nCREATE TABLE part_categories(part_id INTEGER NOT NULL, category_id INTEGER NOT NULL, FOREIGN KEY (part_id) REFERENCES parts (id) ON DELETE CASCADE, FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE);"
        )
    }

    #[test]
    fn model_pluralize() {
        let mut smodel = empty_serde_model().unwrap();
        smodel.entities.push(part_entity());
        smodel.entities.push(category_entity());
        let model = Model::new(smodel.clone()).expect("model should be valid with part+category");

        assert_eq!(model.get_singular("parts").unwrap(), "part");
        assert_eq!(model.get_plural("part").unwrap(), "parts");
        assert_eq!(model.get_singular("categories").unwrap(), "category");
        assert_eq!(model.get_plural("category").unwrap(), "categories");
        assert_eq!(model.get_singular("part").unwrap(), "part");
        assert_eq!(model.get_plural("categories").unwrap(), "categories");
        assert!(model.get_singular("foo").is_err());
        assert!(model.get_plural("foo").is_err());
    }

    #[test]
    fn model_relation_tables() {
        let mut smodel = empty_serde_model().unwrap();
        smodel.entities.push(part_entity());
        smodel.entities.push(category_entity());
        smodel.relations.push(categorised_relation());
        let model = Model::new(smodel.clone())
            .expect("model should be valid with part+category+categorised");

        assert!(model.is_relation_table("part_categories"));
    }
}
