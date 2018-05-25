var SUGGESTIONENGINE = SUGGESTIONENGINE || {
    ownerTypeahead: {
        element: "#owner-typeahead-input",
        localValues: [],
        name: 'owner'
    }
};

// TCREQUESTER.getOwners(SUGGESTIONENGINE.suggesters.ownerTypeahead);

SUGGESTIONENGINE.startPhaseZeroSuggestions = function() {
    /* Start the suggestion engine for owners. This is called from TCREQUESTER.getOwners() when that function is done. */
    SUGGESTIONENGINE.initializeSuggestionEngine(SUGGESTIONENGINE.ownerTypeahead);
};

SUGGESTIONENGINE.initializeSuggestionEngine = function(suggester) {
    // destory any existing typeahead
    $(suggester.element).typeahead('destroy');

    // construct the given suggestion engine
    var suggestionEngine = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: suggester.localValues
    });

    // handle the default values shown
    function suggestionEngineDefault(q, sync) {
        if (q === '') {
            sync(suggestionEngine.get(suggester.localValues[0], suggester.localValues[1], suggester.localValues[2], suggester.localValues[3], suggester.localValues[4]));
        } else {
            suggestionEngine.search(q, sync);
        }
    }

    // initialize the type-ahead
    $(suggester.element).typeahead({
        hint: true,
        highlight: true, /* Enable substring highlighting */
        minLength: 0 /* Specify minimum characters required for showing result */
    },
    {
        name: suggester.name,
        source: suggestionEngineDefault
    });
};
