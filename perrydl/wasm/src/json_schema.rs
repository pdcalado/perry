use crate::error::{Error, Result};
use serde::{self, Deserialize, Serialize};
use serde_json::{Map, Value};

pub const DEFAULT_SCHEMA: &str = "http://json-schema.org/draft-07/schema#";

#[derive(Serialize)]
pub struct JsonSchema {
    /// Corresponding $id field of the schema
    #[serde(rename = "$id")]
    id: String,
    /// Supported schema draft.
    #[serde(rename = "$schema")]
    schema: String,
    /// Object schema.
    properties: Map<String, Value>,
    /// Required properties.
    required: Vec<String>,
}

#[derive(Default, Deserialize, Serialize)]
pub struct Type {
    #[serde(rename = "type")]
    ty: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
}

impl Type {
    pub fn new_from_str(ty: &str) -> Type {
        Type {
            ty: Value::String(ty.to_owned()),
            ..Default::default()
        }
    }

    fn make_nullable(&mut self) {
        let inner = self.ty.clone();
        match inner {
            Value::String(s) => {
                self.ty = Value::Array(vec![Value::String(s), Value::String("null".to_owned())])
            }
            Value::Array(a) => {
                let null = Value::String("null".to_owned());
                if !a.contains(&null) {
                    self.ty.as_array_mut().unwrap().push(null);
                }
            }
            _ => {} // this should not happen with valid json-schema
        }
    }
}

impl JsonSchema {
    pub fn new(id: &str) -> JsonSchema {
        JsonSchema {
            id: id.to_owned(),
            schema: DEFAULT_SCHEMA.to_owned(),
            properties: Map::new(),
            required: Vec::new(),
        }
    }

    pub fn add_property(&mut self, id: &str, ty: Type, required: bool) -> Result<()> {
        if self.properties.get(id).is_some() {
            return Err(Error::new(&format!("property {} already exists", id)));
        }

        let mut inner_type = ty;

        if required {
            self.required.push(id.to_owned());
        } else {
            inner_type.make_nullable();
        }

        self.properties
            .insert(id.to_owned(), serde_json::to_value(inner_type).unwrap());

        Ok(())
    }
}

pub trait GenerateSchema {
    fn json_schema(&self) -> Result<JsonSchema> {
        self.json_schema_with_url("")
    }

    fn json_schema_with_url(&self, schema_url: &str) -> Result<JsonSchema>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn json_schema_nullable_single() {
        let mut ty = Type {
            ty: Value::String("number".to_owned()),
            ..Default::default()
        };

        ty.make_nullable();

        assert_eq!(
            serde_json::to_string(&ty).unwrap(),
            serde_json::to_string(&serde_json::json!({ "type": ["number", "null"]})).unwrap()
        );
    }

    #[test]
    fn json_schema_nullable_multiple() {
        let mut ty = Type {
            ty: Value::Array(vec![
                Value::String("number".to_owned()),
                Value::String("null".to_owned()),
            ]),
            ..Default::default()
        };

        ty.make_nullable();

        assert_eq!(
            serde_json::to_string(&ty).unwrap(),
            serde_json::to_string(&serde_json::json!({ "type": ["number", "null"]})).unwrap()
        );
    }

    #[test]
    fn json_schema_nullable_multiple_missing() {
        let mut ty = Type {
            ty: Value::Array(vec![Value::String("string".to_owned())]),
            ..Default::default()
        };

        ty.make_nullable();

        assert_eq!(
            serde_json::to_string(&ty).unwrap(),
            serde_json::to_string(&serde_json::json!({ "type": ["string", "null"]})).unwrap()
        );
    }

    #[test]
    fn json_schema_object() {
        let mut schema = JsonSchema::new("part");
        schema
            .add_property("label", Type::new_from_str("string"), true)
            .unwrap();
        schema
            .add_property("description", Type::new_from_str("string"), false)
            .unwrap();

        assert_eq!(
            serde_json::to_string(&schema).unwrap(),
            serde_json::to_string(&serde_json::json!(
                {
                    "$id": "part",
                    "$schema": DEFAULT_SCHEMA,
                    "properties": {
                        "label": { "type": "string" },
                        "description": { "type": ["string", "null"] }
                    },
                    "required": ["label"]
                }
            ))
            .unwrap()
        )
    }
}
