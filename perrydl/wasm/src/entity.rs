use crate::common::{Attribute, UniqueConstraint, Visibility};
use crate::error::{Error, Result};
use crate::json_schema::{self, JsonSchema};
use crate::sql;
use crate::urn;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Entity {
    pub id: u32,
    pub urn: String,
    pub singular: String,
    pub plural: String,
    pub name: String,
    pub description: String,
    pub visibility: Visibility,
    pub attributes: Vec<Attribute>,
    #[serde(default)]
    pub unique_constraints: Vec<UniqueConstraint>,
}

impl json_schema::GenerateSchema for Entity {
    fn json_schema_with_url(&self, _: &str) -> Result<JsonSchema> {
        println!("hi from entity schema");

        let mut schema = JsonSchema::new(&self.urn);
        self.attributes
            .iter()
            .map(|a| schema.add_property(&a.id, a.as_json_schema_type(), a.required))
            .collect::<Result<Vec<()>>>()?;
        Ok(schema)
    }
}

impl Entity {
    pub fn validate(&self) -> Result<()> {
        let err = |msg: &str| -> Result<()> {
            Err(Error::new(&format!(
                "invalid '{}' entity: {}",
                self.urn, msg
            )))
        };

        if urn::basename(&self.urn) != self.singular {
            return err("urn basename does not match singular");
        }

        if self.singular == self.plural {
            return err("singular cannot be equal to plural");
        }

        if self.singular.is_empty() || self.plural.is_empty() {
            return err("singular nor plural can be empty strings");
        }

        if self.attributes.len() == 0 {
            return err("attributes list cannot be empty");
        }

        self.attributes
            .iter()
            .map(|attr| attr.validate())
            .collect::<Result<Vec<()>>>()?;

        self.unique_constraints
            .iter()
            .flat_map(|uc| uc.attributes.iter())
            .find(|&id| self.attributes.iter().find(|attr| attr.id == *id).is_none())
            .map(|id| Err(Error::new(&format!("attribute with id '{}' not found", id))))
            .unwrap_or(Ok(()))?;

        Ok(())
    }

    pub fn as_sql_table(&self) -> sql::Table {
        // Generate table first
        let name = self.as_sql_table_name();
        let mut base = sql::Table::new_base(name);
        self.attributes
            .iter()
            .for_each(|attr| base.columns.push(attr.clone().into()));
        base
    }

    pub fn as_sql_trigger(&self) -> sql::Trigger {
        sql::Trigger::new_update_trigger(&self.plural)
    }

    pub fn as_sql_table_name(&self) -> &str {
        &self.plural
    }
}

/// This implementation does not take relations into account.
impl sql::GenerateSql for Entity {
    fn generate_sql(&self) -> Vec<String> {
        vec![
            self.as_sql_table().to_string(),
            self.as_sql_trigger().to_string(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::AttributeType;
    use crate::sql::GenerateSql;

    const RAW_ENTITY: &str = r#"{
            "id": 3,
            "urn": "sampleperry:part",
            "name": "Part",
            "singular": "part",
            "plural": "parts",
            "description": "An electric part",
            "visibility": "Tenant",
            "attributes": [
                {
                    "id": "label",
                    "name": "Label",
                    "description": "Part's unique label",
                    "required": true,
                    "unique": true,
                    "type": "string"
                },
                {
                    "id": "stock",
                    "name": "Stock Units",
                    "description": "Units in stock",
                    "required": false,
                    "type": "integer"
                }
            ]
        }"#;

    #[test]
    fn entity_serialize() {
        serde_json::from_str::<Entity>(RAW_ENTITY).unwrap();
    }

    #[test]
    fn entity_to_schema() {
        let entity = serde_json::from_str::<Entity>(RAW_ENTITY).unwrap();
        use json_schema::GenerateSchema;

        let schema = entity.json_schema_with_url("").unwrap();

        assert_eq!(
            serde_json::to_string(&schema).unwrap(),
            serde_json::to_string(&serde_json::json!(
                {
                    "$id": "sampleperry:part",
                    "$schema": json_schema::DEFAULT_SCHEMA,
                    "properties": {
                        "label": { "type": "string" },
                        "stock": { "type": ["integer", "null"] }
                    },
                    "required": ["label"]
                }
            ))
            .unwrap()
        )
    }

    #[test]
    fn entity_validate() {
        let entity = serde_json::from_str::<Entity>(RAW_ENTITY).unwrap();
        use json_schema::GenerateSchema;
        let schema = entity.json_schema_with_url("").unwrap();
        let as_json = serde_json::to_value(schema).unwrap();

        let compiled =
            jsonschema::JSONSchema::compile(&as_json, Some(jsonschema::Draft::Draft7)).unwrap();

        // must not fail to validate
        {
            let instance = serde_json::json!({
                "label": "fvh", "stock": 3
            });

            let result = compiled.validate(&instance);

            if let Err(errors) = result {
                for error in errors {
                    eprintln!("error: {}", error);
                }
                panic!("failed to validate")
            }
        }

        // must not fail to validate
        {
            let instance = serde_json::json!({
                "label": "fvh"
            });

            let result = compiled.validate(&instance);

            if let Err(errors) = result {
                for error in errors {
                    eprintln!("error: {}", error);
                }
                panic!("failed to validate")
            }
        }

        // must fail to validate
        {
            let instance = serde_json::json!({
                "stock": "3"
            });

            let result = compiled.validate(&instance);

            if let Err(errors) = result {
                for error in errors {
                    println!("{}", error);
                }
            } else {
                panic!("should have panic'ed");
            }
        }

        // must fail to validate
        {
            let instance = serde_json::json!({
                "label": "fvh", "stock": "3"
            });

            let result = compiled.validate(&instance);

            if let Err(errors) = result {
                for error in errors {
                    println!("{}", error);
                }
            } else {
                panic!("should have panic'ed");
            }
        }
    }

    #[test]
    fn entity_to_sql() {
        let entity = Entity {
            id: 1,
            urn: "sampleperry:part".to_owned(),
            singular: "part".to_owned(),
            plural: "parts".to_owned(),
            name: "Auto Part".to_owned(),
            description: "An electric part".to_owned(),
            visibility: Visibility::Tenant,
            attributes: vec![
                Attribute {
                    id: "label".to_owned(),
                    name: "Label".to_owned(),
                    description: "part's label".to_owned(),
                    required: true,
                    unique: true,
                    ty: AttributeType::String,
                },
                Attribute {
                    id: "stock".to_owned(),
                    name: "Stock Units".to_owned(),
                    description: "Units in stock".to_owned(),
                    ty: AttributeType::Integer,
                    ..Default::default()
                },
            ],
            unique_constraints: vec![],
        };

        assert_eq!(
            entity.generate_sql().join("\n"),
            "CREATE TABLE parts(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, label TEXT UNIQUE NOT NULL, stock INTEGER);\nCREATE TRIGGER parts_updated_at AFTER UPDATE ON parts WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE parts SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;".to_owned()
        );
    }
}
