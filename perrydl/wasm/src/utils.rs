pub fn is_snake_case(text: &str) -> bool {
    text.chars()
        .find(|c| match c {
            '_' => false,
            'a'..='z' | '0'..='9' => false,
            _ => true,
        })
        .is_none()
}
