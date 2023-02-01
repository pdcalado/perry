use crate::error::{Error, Result};
use crate::json_schema;
use crate::sql;
use crate::utils;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum Visibility {
    User,
    Global,
    Tenant,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum AttributeType {
    #[serde(rename = "string")]
    String,
    #[serde(rename = "integer")]
    Integer,
    #[serde(rename = "real")]
    Real,
    #[serde(rename = "bool")]
    Bool,
    #[serde(rename = "timestamp")]
    Timestamp,
}

impl Default for AttributeType {
    fn default() -> Self {
        AttributeType::String
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct Attribute {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub unique: bool,
    #[serde(rename = "type")]
    pub ty: AttributeType,
}

impl Attribute {
    pub fn as_sql_type(&self) -> sql::Type {
        match self.ty {
            AttributeType::String => sql::Type::Text,
            AttributeType::Integer => sql::Type::Integer,
            AttributeType::Real => sql::Type::Real,
            AttributeType::Bool => sql::Type::Boolean,
            AttributeType::Timestamp => sql::Type::Date,
        }
    }

    pub fn as_json_schema_type(&self) -> json_schema::Type {
        let as_str = match self.ty {
            AttributeType::String => "string",
            AttributeType::Integer => "integer",
            AttributeType::Real => "number",
            AttributeType::Bool => "boolean",
            AttributeType::Timestamp => "integer",
        };
        json_schema::Type::new_from_str(as_str)
    }

    /// Validates that the rules
    pub fn validate(&self) -> Result<()> {
        match self.id.as_str() {
            "id" | "created_at" | "updated_at" | "rev" => {
                return Err(Error::new(&format!(
                    "attribute id '{}' cannot be used",
                    self.id
                )));
            }
            _ => {}
        }

        if !utils::is_snake_case(&self.id) {
            return Err(Error::new(&format!(
                "attribute id must be snake_case all lowercase",
            )));
        }

        Ok(())
    }
}

impl From<Attribute> for sql::Column {
    fn from(attr: Attribute) -> Self {
        Self {
            ty: attr.as_sql_type(),
            name: attr.id,
            not_null: attr.required,
            auto_increment: false,
            primary_key: false,
            unique: attr.unique,
            default: None,
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct UniqueConstraint {
    pub attributes: Vec<String>,
    pub relations: Vec<String>,
}
