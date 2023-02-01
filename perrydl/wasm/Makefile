OUT_DIR=pkg
PKG_JSON=$(OUT_DIR)/package.json
CRATE_FOLDER=$(dir $(shell git ls-files --full-name Cargo.toml))
TMP_PKG=/tmp/$(shell date +%s)_package.json
PREFIX=@pdcalado

# Package with wasm-pack but fix the package.json file with "repository" field
release-pack:
	wasm-pack build --release --out-dir $(OUT_DIR) --target nodejs
	$(MAKE) fix-package-json

publish:
	wasm-pack publish --access public

fix-package-json:
	$(eval CURRENT_NAME := $(shell cat $(PKG_JSON) | jq -r '.name'))
	cat $(PKG_JSON) | jq '.name = "$(PREFIX)/$(CURRENT_NAME)"' | \
		jq '.repository.directory = "$(CRATE_FOLDER)"' > $(TMP_PKG)
	cp $(TMP_PKG) $(PKG_JSON)
