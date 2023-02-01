use crate::common::{Attribute, Visibility};
use crate::error::{Error, Result};
use crate::json_schema::{self, JsonSchema, Type};
use crate::urn;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
pub enum Cardinality {
    OneToMany,
    ManyToMany,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Relation {
    pub id: u32,
    pub urn: String,
    pub name: String,
    pub description: String,
    pub visibility: Visibility,
    pub origin: String,
    pub destination: String,
    pub cardinality: Cardinality,
    pub attributes: Vec<Attribute>,
}

impl Relation {
    pub fn validate(&self) -> Result<()> {
        let err = |msg: &str| -> Result<()> {
            Err(Error::new(&format!(
                "invalid '{}' relation: {}",
                self.urn, msg
            )))
        };

        urn::is_valid(&self.urn)?;

        if urn::not_basename(&self.urn) != urn::not_basename(&self.origin) {
            return err(&format!(
                "origin '{}' does not share the namespace of '{}'",
                self.urn, self.origin
            ));
        }

        if urn::not_basename(&self.urn) != urn::not_basename(&self.destination) {
            return err(&format!(
                "destination '{}' does not share the namespace of '{}'",
                self.urn, self.origin
            ));
        }

        if self.cardinality == Cardinality::OneToMany && !self.attributes.is_empty() {
            return err(&format!("OneToMany relations cannot have attributes"));
        }

        let under_id = self.attributes.iter().any(|a| a.id.ends_with("_id"));
        if under_id {
            return err("attributes cannot end with '_id'");
        }

        self.attributes
            .iter()
            .map(|attr| attr.validate())
            .collect::<Result<Vec<()>>>()?;

        Ok(())
    }

    pub fn is_destination(&self, urn: &str, cardinality: Cardinality) -> bool {
        self.cardinality == cardinality && self.destination == urn
    }
}

impl json_schema::GenerateSchema for Relation {
    fn json_schema_with_url(&self, _: &str) -> Result<JsonSchema> {
        let orig_id = format!("{}_id", urn::basename(&self.origin));
        let dest_id = format!("{}_id", urn::basename(&self.destination));

        let mut schema = JsonSchema::new(&self.urn);
        schema.add_property(&orig_id, Type::new_from_str("integer"), true)?;
        schema.add_property(&dest_id, Type::new_from_str("integer"), true)?;
        self.attributes
            .iter()
            .map(|a| schema.add_property(&a.id, a.as_json_schema_type(), a.required))
            .collect::<Result<Vec<()>>>()?;
        Ok(schema)
    }
}
