use crate::error::{Error, Result};

pub fn is_valid(urn: &str) -> Result<()> {
    urn.chars()
        .map(|c| match c {
            ':' | '_' => Ok(()),
            'a'..='z' | '0'..='9' => Ok(()),
            a => Err(Error::new(&format!("invalid char: {}", a))),
        })
        .collect::<Result<()>>()
}

/// Get the basename of a urn
pub fn basename(urn: &str) -> &str {
    urn.rsplitn(2, ':').nth(0).unwrap_or(&urn)
}

pub fn not_basename(urn: &str) -> &str {
    urn.rsplitn(2, ':').last().unwrap_or(&urn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn urn_basenames() {
        assert_eq!(basename("foo"), "foo");
        assert_eq!(basename("foo:bar"), "bar");
        assert_eq!(basename("foo:bar:qux"), "qux");
        assert_eq!(not_basename("foo"), "foo");
        assert_eq!(not_basename("foo:bar"), "foo");
        assert_eq!(not_basename("foo:bar:qux"), "foo:bar");
    }

    #[test]
    fn urn_validity() {
        is_valid("balbla:sub").expect("urn should be valid");
        is_valid("balbla:sub:sdflsdf12:023").expect("urn should be valid");
        is_valid("zbalbla:subz").expect("urn should be valid, is inclusive");
        is_valid("Adsf:sd").expect_err("urn should be invalid, has A");
        is_valid("zdsf!:sd").expect_err("urn should be invalid, has !");
        is_valid("zdsf!:sd ds:2").expect_err("urn should be invalid, has ' '");
    }
}
