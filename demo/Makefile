models:
	cd ../models && npm run package && cd -

dupe:
	cd ../dupe && $(MAKE) release && cd -

.PHONY: models dupe

build: models dupe
	cp ../models/models build/models
	cp ../models/data.json build/
	cp ../dupe/build/node_sqlite3.node ../dupe/build/dupe build/
	cp ../dupe/latest-backup.sql build/
	cp -r ../proto build/

image:
	docker build -t perry-demo .
