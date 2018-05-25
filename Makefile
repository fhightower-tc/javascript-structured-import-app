help:
	@echo "pack 	package the app"

pack:
	# remove the old app
	rm -f TCS_-_Structured_Import.zip
	# copy the app into a new directory
	cp -r ./TCS_-_Structured_Import TCS_-_Structured_Import_\(JavaScript\)
	# zip the app (do it recursively (-r) and ignore any hidden mac files like '_MACOSX' and '.DS_STORE' (-X))
	zip -r -X TCS_-_Structured_Import.zip TCS_-_Structured_Import_\(JavaScript\)
	# remove the copy of this package
	rm -rf TCS_-_Structured_Import_\(JavaScript\)
	@echo "App has been packaged here: TCS_-_Structured_Import.zip"
