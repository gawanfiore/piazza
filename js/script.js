(function(window, document, undefined) {

    // pane elements
    var rightPane = document.getElementById('right-pane');
    var leftPane = document.getElementById('left-pane');

    // script elements that correspond to Handlebars templates
    var questionFormTemplate = document.getElementById('question-form-template');
    var questionsTemplate = document.getElementById('questions-template');
    var expQuestionTemplate = document.getElementById('expanded-question-template');

    // TODO: add other script elements corresponding to templates here

    // compiled Handlebars templates
    var templates = {
        renderQuestionForm: Handlebars.compile(questionFormTemplate.innerHTML), 
        renderQuestions: Handlebars.compile(questionsTemplate.innerHTML), 
        renderExpQuestion: Handlebars.compile(expQuestionTemplate.innerHTML)
    };

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //  Utility funcs for getting and filtering questions & responses from localStorage
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // Returns the questions stored in localStorage
    function getStoredQuestions() {
        if (!localStorage.questions) {
            // default to empty array
            localStorage.questions = JSON.stringify([]);
        }
        return JSON.parse(localStorage.questions);
    }

    // Store the given questions array in localStorage
    function storeQuestions(questions) {
        localStorage.questions = JSON.stringify(questions);
    }

    // Returns a question object corresponding to the question id (qID)
    function getQuestFromID(qID) {
        var questions = getStoredQuestions();
        filtered = questions.filter(function(question) {
            return question.id == qID;
        });
        return filtered[0];
    }

    // Returns the responses stored in localStorage
    function getStoredResponses() {
        if (!localStorage.responses) {
            //default to empty array
            localStorage.responses = JSON.stringify([]);
        }
        return JSON.parse(localStorage.responses);
    }

    // Store the given responses array in localStorage
    function storeResponses(responses) {
        localStorage.responses = JSON.stringify(responses);
    }

    // Returns an array of response objects corresponding to the question id (qID)
    function getRespFromQID(qID) {
        var responses = getStoredResponses();
        filtered = responses.filter(function(response) {
            return response.qid == qID;
        });
        return filtered;
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //  Functions to execute panel changes, posting, and search functionality
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // Displays the question form in the right pane
    function displayQuestionForm() {
        var renderQuestion = templates.renderQuestionForm;
        var finalHTML = renderQuestion();
        rightPane.innerHTML = finalHTML;
        //add event listener for new question form submission
        var questionForm = document.getElementById('question-form');
        questionForm.addEventListener("submit", function(event) {
            event.preventDefault();
            postQuestion(this);
        });
    }

    // Handles posting a new question
    function postQuestion(form) {
        // used to get a non-decimal id
        RANDOM_ID_MULTIPLIER = 10000000000000000;
        // assign question attibutes and add it to localStorage
        var q = new Object();
        q.id = Math.floor(Math.random() * RANDOM_ID_MULTIPLIER);
        q.subject = form.querySelector('input[name="subject"]').value;
        q.question = form.querySelector('textarea[name="question"]').value;
        if(!q.subject || !q.question) {
            form.querySelector('input[name="subject"]').value = "";
            form.querySelector('textarea[name="question"]').value = "";
            return;
        }
        var questions = getStoredQuestions();
        questions[questions.length] = q;
        storeQuestions(questions);

        // update displayed list of questions (null -> no search term)
        displayQuestions(null);
        //reset form
        form.querySelector('input[name="subject"]').value = "";
        form.querySelector('textarea[name="question"]').value = "";
    }


    // Update displayed list of questions in left panel
    // -> falsey values for @searchTerm indicate no search term to filter questions by
    function displayQuestions(searchTerm) {
        var questions = getStoredQuestions();
        //handle search filter if applicable
        if(searchTerm) {
            questions = filterSearch(questions, searchTerm);
            checkRightPanel(questions);
        }
        var renderQuestion = templates.renderQuestions;
        var finalHTML = renderQuestion({
            questions: questions
        });
        leftPane.innerHTML = finalHTML;

        //attach click event listener to each question
        var qElems = document.getElementsByClassName('question-info');
        for(var i = 0; i < qElems.length; i++) {
            qElems[i].addEventListener("click", function(event) {
                showQuestion(getQuestFromID(this.id), getRespFromQID(this.id));
            });
        }
    }

    // Helper function to return only questions with the search term included in subject or question
    // Returns an array containing the searched-for questions
    function filterSearch(questions, searchTerm) {
        var filtered = questions.filter(function(question) {
            // if subject includes searchTerm
            if(question.subject.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0) {
                return true;
            }
            // if question includes searchTerm
            if(question.question.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0) {
                return true;
            }
            return false;
        });
        return filtered;
    }

    /* Helper function used when search filtering is active
     * Checks if a question is displayed in the right pane and, if so, if it is in the search results
     * If displayed question is NOT in search results, resets right pane to new question form, otherwise does nothing
     */
    function checkRightPanel(questions) {
        //check to see if a question is currently being displayed in the right pane
        var questionDisplayed = document.getElementById('right-pane').querySelector('.question');
        if(questionDisplayed) {
            //filtered will contain an element if the currently shown question is still in the search results
            var filtered = questions.filter(function(question) {
                var qid = questionDisplayed.dataset.id;
                return qid == question.id;
            });
            //if the currently shown question is not in the search results, hide it and display question form
            if(filtered.length <= 0) {
                displayQuestionForm();
            }
        }
    }

    // Display a question and its responses in the right pane
    function showQuestion(question, responses) {
        //render handlebars into html
        var renderQuestion = templates.renderExpQuestion;
        var finalHTML = renderQuestion({
            id: question.id,
            subject: question.subject,
            question: question.question,
            responses: responses
        });
        rightPane.innerHTML = finalHTML;
        //attach event listener to the response submit btn
        var responseForm = document.getElementById('response-form');
        responseForm.addEventListener("submit", function(event) {
            event.preventDefault();
            postResponse(this);
        });
        //attach event listener to the resolve btn
        var resolveBtn = document.querySelector('.resolve-container .resolve');
        resolveBtn.addEventListener("click", function(event) {
            event.preventDefault();
            qid = this.dataset.id;
            resolveQuestion(qid);
        });
    }

    // Handles posting a response to a question
    function postResponse(form) {
        //create response
        var r = new Object();
        var qid = form.querySelector('input[name="resp-qid"]').value;
        r.qid = qid;
        r.name = form.querySelector('input[name="name"]').value;
        r.response = form.querySelector('textarea[name="response"]').value;
        if(!r.name || !r.response) {
            form.querySelector('input[name="name"]').value = "";
            form.querySelector('textarea[name="response"]').value = "";
            return;
        }
        var responses = getStoredResponses();
        responses[responses.length] = r;
        storeResponses(responses);

        // redisplay question to show new response
        showQuestion(getQuestFromID(qid), getRespFromQID(qid));

        //reset form
        form.querySelector('input[name="name"]').value = "";
        form.querySelector('textarea[name="response"]').value = "";
    }

    // Handles resolving (deleting) a question
    function resolveQuestion(qID) {
        //remove question from localStorage
        var questions = getStoredQuestions();
        var filteredQuestions = questions.filter(function(question) {
            return question.id != qID;
        });
        storeQuestions(filteredQuestions);

        //remove responses from localStorage
        var responses = getStoredResponses();
        var filteredResponses = responses.filter(function(response) {
            return response.qid != qID;
        });
        storeResponses(filteredResponses);

        //refresh left panel
        displayQuestions(null);
        //render new question form in right panel
        displayQuestionForm();
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //  Various initialization and attachment of event listeners
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    //initialize question list
    displayQuestions(null);
    //initialize question form
    displayQuestionForm();
    //add event listener for new question btn
    var newFormBtn = document.querySelector('#interactors .btn');
    newFormBtn.addEventListener("click", function(event) {
        event.preventDefault();
        displayQuestionForm();
    });
    //add event listener for search bar
    var search = document.getElementById('search');
    search.addEventListener("keyup", function(event) {
        var query = search.value;
        if(query) {
            displayQuestions(query);
        } else {
            displayQuestions(null);
        } 
    });

})(this, this.document);
