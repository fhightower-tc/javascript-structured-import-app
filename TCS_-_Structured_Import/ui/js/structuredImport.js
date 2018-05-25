/* global window, document, console, $,  */
"use-strict";

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

INDICATOR_TYPES = ['address', 'emailaddress', 'file', 'host', 'url']

var STRUCTUREDIMPORT = new Vue({
    el: "#app-content",
    data: {
        rawContent: "",
        owner: "",
        contentArray: [],
        poorlyFormattedLines: [],
        inactiveContentArray: [],
        splitString: "",
        visible: false,
        findCount: undefined,
        selectedOwner: "",
        loadingPhaseOne: false,
        loadingSuffix: "",
        phase: 0,
        removeAfterCreated: true,
        find: "",
        replace: "",
        successMessageShown: false,
    },
    computed: {
        tc: function () {
            /* Start an instance of the TC SDK. */
            var tcSpaceElementId = getParameterByName('tcSpaceElementId'); // spaces mode if spaceElementId defined

            if (tcSpaceElementId) {
                var apiSettings = {
                    apiToken: getParameterByName('tcToken'),
                    apiUrl: getParameterByName('tcApiPath')
                };
            }
            var tc = new ThreatConnect(apiSettings);

            return tc;
        },
        tcSelectedType: function() {
            return groupHelper(getParameterByName("tcType"));
        },
        tcSimpleType: function() {
            if (this.tcSelectedType !== undefined) {
                return this.tcSelectedType.type;
            } else {
                return undefined;
            }
        },
        owners: function () {
            var _this = this;
            this.tc.owners()
                .done(function(response) {
                    response.data.forEach(function(owner) {
                        SUGGESTIONENGINE.ownerTypeahead.localValues.push(owner.name);
                    });
                    SUGGESTIONENGINE.startPhaseZeroSuggestions();
                })
                .error(function(response) {
                    console.error('Unable to retrieve the owners: ', response);
                    $.jGrowl("Unable to retrieve the owners from ThreatConnect: " + response.error, { group: 'failure-growl' });
                })
                .retrieve();
        }
    },
    methods: {
        startApp: function() {
            // make the main app div visible (this prevents a flash of un-styled content)
            this.visible = true;
            // start the zurb foundation scripts
            window.setTimeout(function() {
                $(document).foundation();
                $('#contentTextarea').focus();
            }, 1);
        },
        startPhaseOne: function() {
            /* Split the structured content and display it for the user. */
            if (this.rawContent === '') {
                $.jGrowl('Please enter some content', {group: 'failure-growl'});
                return;
            }

            if (this.splitString === '') {
                $.jGrowl('Please enter character(s) on which you would like to split the content', {group: 'failure-growl'});
                return;
            }

            this.loadingPhaseOne = true;
            var lines = this.rawContent.trim().split('\n');
            
            if (lines.length === 0 || lines.length === 1) {
               
            }

            // ask the user if they would like to continue
            if (lines.length > 3000) {
                var confirmation = confirm("There are a lot of lines in the text (" + lines.length + " of them). Working with this many lines may slow your browser down.\n\nDo you want to continue?");
                if (!confirmation) {
                    this.loadingPhaseOne = false;
                    return;
                }
            }

            // determine the expected length of each line
            var expectedLength;
            if (lines[0].split(this.splitString).length === lines[1].split(this.splitString).length && lines[0].split(this.splitString).length === lines[2].split(this.splitString).length) {
                expectedLength = lines[0].split(this.splitString).length;
            } else if (lines[1].split(this.splitString).length === lines[2].split(this.splitString).length) {
                expectedLength = lines[1].split(this.splitString).length;
            } else {
                $.jGrowl('The input data is strange... I\'m having a hard time figuring out how long each line should be. Make sure the split string you provided is correct and talk to John if you have any questions.', {group: 'warning-growl', life: 10000});
                this.loadingPhaseOne = false;
                return;
            }

            for (var i = lines.length - 1; i >= 0; i--) {
                var lineArray = lines[i].split(this.splitString);
                if (lineArray.length !== expectedLength) {
                    this.poorlyFormattedLines.push(lineArray);
                } else {
                    this.contentArray.push(lineArray);
                }
            }

            // show phase one UI
            this.phase = 1;
            // get the owners which will also setup the suggestionEngine
            this.owners;
        },
        findAndReplace: function() {
            /* Find and replace data in the text field. */
            if (this.find === "") {
                $.jGrowl('Please enter a search term', {group: 'failure-growl'});
                return;
            }

            this.rawContent = replaceAll(this.rawContent, this.find, this.replace);
            $.jGrowl('Done', {group: 'success-growl'});
        },
        createContent: function() {
            /* Create the content according to the mapping. */
            this.owner = $('#owner-typeahead-input').val()
            
            if (this.owner === '') {
                $.jGrowl('Please enter an owner where the data will be created', {group: 'failure-growl'});
                return;
            }

            var mappings = [];
            $('select').each(function() {
                mappings.push($(this).val());
            });

            var additionalInputs = [];
            $('.supplementalInput').each(function() {
                additionalInputs.push($(this).val());
            });

            // iterate through each row in the table
            for (var i = this.contentArray.length - 1; i >= 0; i--) {
                var indicator = null;
                var indicatorType = null;
                var fileSize = null;
                var fileName = null;
                var attributes = [];
                var tags = [];
                // iterate through each cell in the row
                for (var j = this.contentArray[i].length - 1; j >= 0; j--) {
                    console.log("would create ", this.contentArray[i][j], " as ", mappings[j]);
                    if (INDICATOR_TYPES.indexOf(mappings[j]) !== -1) {
                        indicator = this.contentArray[i][j];
                        // if the indicatorType is already defined (which means that the user is trying to map multiple columns into indicators), throw an error message
                        if (indicatorType !== null) {
                            $.jGrowl('Currently, only one cell from each row can be created as an indicator. You are trying to create ' + indicatorType.type + ' indicators and ' + indicatorHelper(mappings[j]).type + ' indicators from data in the same row.', {group: 'failure-growl', life: 10000});
                            return;
                        }
                        indicatorType = indicatorHelper(mappings[j]);
                    } else if (mappings[j] === 'attribute') {
                        if (additionalInputs[j] === '') {
                            message = "You are trying to add a column as an attribute. Please specify the type of the attribute you would like to add.";
                            $.jGrowl(message, {group: 'failure-growl', life: 10000});
                            return;
                        }
                        attributes.push({
                            'type': additionalInputs[j],
                            'value': this.contentArray[i][j]
                        });
                    } else if (mappings[j] === 'tag') {
                        tags.push(this.contentArray[i][j]);
                    } else if (mappings[j] === 'fileSize') {
                        fileSize= this.contentArray[i][j];
                    } else if (mappings[j] === 'fileName') {
                        fileName = this.contentArray[i][j];
                    }
                }

                // make sure an indicator was selected
                if (indicatorType === null) {
                    $.jGrowl('One of the fields need to be mapped as an indicator', {group: 'failure-growl'});
                    return;
                }

                this.createIndicator(indicator, indicatorType, attributes, tags, fileSize, fileName);
            }
        },
        createIndicator: function(indicator, indicatorType, attributes, tags, fileSize, fileName) {
            /* Create an indicator. */
            var _this = this;
            var indicators = _this.tc.indicators();

            if (fileSize) {
                indicators.size(fileSize);
            }

            indicators.owner(_this.owner)
                .indicator(indicator)
                .type(indicatorType)
                .done(function(response) {
                    if (!_this.successMessageShown) {
                        $.jGrowl('Success!', {group: 'success-growl', life: 5000});
                        _this.successMessageShown = true;
                    }
                })
                .error(function(response) {
                    console.log('error response', response);
                    $.jGrowl('Unable to create content: ' + response.error + '<br/><br/> Check console for more details.', {group: 'failure-growl'});
                })
                .commit(function() {
                    if (attributes) {
                        for (var i = attributes.length - 1; i >= 0; i--) {
                            indicators.commitAttribute(attributes[i]);
                        }
                    }
                    
                    if (tags) {
                        for (var i = tags.length - 1; i >= 0; i--) {
                            indicators.commitTag(tag);
                        }
                    }

                    if (fileName) {
                        indicators.commitFileOccurrence({
                            fileName: fileName,
                        });
                    }
                });
        },
        findEntryIndex: function(entry, array) {
            for (var i = array.length - 1; i >= 0; i--) {
                var broken = false;
                for (var j = entry.length - 1; j >= 0; j--) {
                    if (entry[j] != array[i][j]) {
                        broken = true;
                        break;
                    }
                }

                if (!broken) {
                    return i;
                }
            }
            return null;
        },
        changeActiveStatus: function(entry, makeActive) {
            /* Make an entry active/inactive.
            
            Inputs:

            - entry: an array (one of the rows from the table)
            - makeActive: boolean

             */
            // find the entry
            if (makeActive) {
                var index = this.findEntryIndex(entry, this.inactiveContentArray);
                this.inactiveContentArray.splice(index, 1);
                this.contentArray.push(entry);
            } else {
                var index = this.findEntryIndex(entry, this.contentArray);
                this.contentArray.splice(index, 1);
                this.inactiveContentArray.push(entry);
            }
        }
    }
});
