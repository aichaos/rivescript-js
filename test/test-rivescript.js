var TestCase = require("./test-base");

/* IMPORTANT NOTE: Make sure your text editor shows newline characters,
   especially trailing spaces. We use a \ to make multi-line strings easier
   to write for these tests, and any spaces after a \ will cause a syntax
   error. You've been warned! */

/******************************************************************************
 * BEGIN Block Tests
 ******************************************************************************/

exports.test_no_begin_block = function(test) {
    var bot = new TestCase(test, "\
        + hello bot\n\
        - Hello human.\n\
    ");
    bot.reply("Hello bot", "Hello human.");
    test.done();
};

exports.test_simple_begin_block = function(test) {
    var bot = new TestCase(test, "\
        > begin\n\
            + request\n\
            - {ok}\n\
        < begin\n\
        \n\
        + hello bot\n\
        - Hello human.\n\
    ");
    bot.reply("Hello bot.", "Hello human.");
    test.done();
};

exports.test_blocked_begin_block = function(test) {
    var bot = new TestCase(test, "\
        > begin\n\
            + request\n\
            - Nope.\n\
        < begin\n\
        \n\
        + hello bot\n\
        - Hello human.\n\
    ");
    bot.reply("Hello bot.", "Nope.");
    test.done();
};

exports.test_conditional_begin_block = function(test) {
    var bot = new TestCase(test, "\
        > begin\n\
            + request\n\
            * <get met> == undefined => <set met=true>{ok}\n\
            * <get name> != undefined => <get name>: {ok}\n\
            - {ok}\n\
        < begin\n\
        \n\
        + hello bot\n\
        - Hello human.\n\
        \n\
        + my name is *\n\
        - <set name=<formal>>Hello, <get name>.\n\
    ");
    bot.reply("Hello bot.", "Hello human.");
    bot.uservar("met", "true");
    bot.uservar("name", "undefined");
    bot.reply("My name is bob", "Hello, Bob.");
    bot.uservar("name", "Bob");
    bot.reply("Hello Bot", "Bob: Hello human.");
    test.done();
};

/******************************************************************************
 * Bot Variable Tests
 ******************************************************************************/

 exports.test_bot_variables = function(test) {
     var bot = new TestCase(test, "\
        ! var name = Aiden\n\
        ! var age = 5\n\
        \n\
        + what is your name\n\
        - My name is <bot name>.\n\
        \n\
        + how old are you\n\
        - I am <bot age>.\n\
        \n\
        + what are you\n\
        - I'm <bot gender>.\n\
        \n\
        + happy birthday\n\
        - <bot age=6>Thanks!\n\
     ");
     bot.reply("What is your name?", "My name is Aiden.");
     bot.reply("How old are you?", "I am 5.");
     bot.reply("What are you?", "I'm undefined.");
     bot.reply("Happy birthday!", "Thanks!");
     bot.reply("How old are you?", "I am 6.");
     test.done();
 };

exports.test_global_variables = function(test) {
    var bot = new TestCase(test, "\
        ! global debug = false\n\
        \n\
        + debug mode\n\
        - Debug mode is: <env debug>\n\
        \n\
        + set debug mode *\n\
        - <env debug=<star>>Switched to <star>.\n\
    ");
    bot.reply("Debug mode.", "Debug mode is: false");
    bot.reply("Set debug mode true", "Switched to true.");
    bot.reply("Debug mode?", "Debug mode is: true");
    test.done();
};

/******************************************************************************
 * Substitution Tests
 ******************************************************************************/

 exports.test_substitutions = function(test) {
     var bot = new TestCase(test, "\
        + whats up\n\
        - nm.\n\
        \n\
        + what is up\n\
        - Not much.\n\
     ");
     bot.reply("whats up", "nm.");
     bot.reply("what's up?", "nm.");
     bot.reply("what is up?", "Not much.");

     bot.extend("\
        ! sub whats  = what is\n\
        ! sub what's = what is\n\
     ");
     bot.reply("whats up", "Not much.");
     bot.reply("what's up?", "Not much.");
     bot.reply("What is up?", "Not much.");
     test.done();
 };

exports.test_person_substitutions = function(test) {
    var bot = new TestCase(test, "\
        + say *\n\
        - <person>\n\
    ");
    bot.reply("say I am cool", "i am cool");
    bot.reply("say You are dumb", "you are dumb");

    bot.extend("\
        ! person i am    = you are\n\
        ! person you are = I am\n\
    ");
    bot.reply("say I am cool", "you are cool");
    bot.reply("say You are dumb", "I am dumb");
    test.done();
};

/******************************************************************************
 * Trigger Tests
 ******************************************************************************/

exports.test_atomic_triggers = function(test) {
    var bot = new TestCase(test, "\
        + hello bot\n\
        - Hello human.\n\
        \n\
        + what are you\n\
        - I am a RiveScript bot.\n\
    ");
    bot.reply("Hello bot", "Hello human.");
    bot.reply("What are you?", "I am a RiveScript bot.");
    test.done();
};

exports.test_wildcard_triggers = function(test) {
    var bot = new TestCase(test, "\
        + my name is *\n\
        - Nice to meet you, <star>.\n\
        \n\
        + * told me to say *\n\
        - Why did <star1> tell you to say <star2>?\n\
        \n\
        + i am # years old\n\
        - A lot of people are <star>.\n\
        \n\
        + i am _ years old\n\
        - Say that with numbers.\n\
        \n\
        + i am * years old\n\
        - Say that with fewer words.\n\
    ");
    bot.reply("my name is Bob", "Nice to meet you, bob.");
    bot.reply("bob told me to say hi", "Why did bob tell you to say hi?");
    bot.reply("i am 5 years old", "A lot of people are 5.");
    bot.reply("i am five years old", "Say that with numbers.");
    bot.reply("i am twenty five years old", "Say that with fewer words.");
    test.done();
};

exports.test_alternatives_and_optionals = function(test) {
    var bot = new TestCase(test, "\
        + what (are|is) you\n\
        - I am a robot.\n\
        \n\
        + what is your (home|office|cell) [phone] number\n\
        - It is 555-1234.\n\
        \n\
        + [please|can you] ask me a question\n\
        - Why is the sky blue?\n\
    ");
    bot.reply("What are you?", "I am a robot.");
    bot.reply("What is you?", "I am a robot.");

    bot.reply("What is your home phone number?", "It is 555-1234.");
    bot.reply("What is your home number?", "It is 555-1234.");
    bot.reply("What is your cell phone number?", "It is 555-1234.");
    bot.reply("What is your office number?", "It is 555-1234.");

    bot.reply("Can you ask me a question?", "Why is the sky blue?");
    bot.reply("Please ask me a question?", "Why is the sky blue?");
    bot.reply("Ask me a question.", "Why is the sky blue?");
    test.done();
};

exports.test_trigger_arrays = function(test) {
    var bot = new TestCase(test, "\
        ! array colors = red blue green yellow white\n\
          ^ dark blue|light blue\n\
        \n\
        + what color is my (@colors) *\n\
        - Your <star2> is <star1>.\n\
        \n\
        + what color was * (@colors) *\n\
        - It was <star2>.\n\
        \n\
        + i have a @colors *\n\
        - Tell me more about your <star>.\n\
    ");
    bot.reply("What color is my red shirt?", "Your shirt is red.");
    bot.reply("What color is my blue car?", "Your car is blue.");
    bot.reply("What color is my pink house?", "ERR: No Reply Matched");
    bot.reply("What color is my dark blue jacket?", "Your jacket is dark blue.");
    bot.reply("What color was Napoleoan's white horse?", "It was white.");
    bot.reply("What color was my red shirt?", "It was red.");
    bot.reply("I have a blue car.", "Tell me more about your car.");
    bot.reply("I have a cyan car.", "ERR: No Reply Matched");
    test.done();
};

exports.test_weighted_triggers = function(test) {
    var bot = new TestCase(test, "\
        + * or something{weight=10}\n\
        - Or something. <@>\n\
        \n\
        + can you run a google search for *\n\
        - Sure!\n\
        \n\
        + hello *{weight=20}\n\
        - Hi there!\n\
    ");
    bot.reply("Hello robot.", "Hi there!");
    bot.reply("Hello or something.", "Hi there!");
    bot.reply("Can you run a Google search for Node", "Sure!");
    bot.reply("Can you run a Google search for Node or something", "Or something. Sure!");
    test.done();
};

/******************************************************************************
 * Reply Tests
 ******************************************************************************/

exports.test_previous = function(test) {
    var bot = new TestCase(test, "\
        ! sub who's  = who is\n\
        ! sub it's   = it is\n\
        ! sub didn't = did not\n\
        \n\
        + knock knock\n\
        - Who's there?\n\
        \n\
        + *\n\
        % who is there\n\
        - <sentence> who?\n\
        \n\
        + *\n\
        % * who\n\
        - Haha! <sentence>!\n\
        \n\
        + *\n\
        - I don't know.\n\
    ");
    bot.reply("knock knock", "Who's there?");
    bot.reply("Canoe", "Canoe who?");
    bot.reply("Canoe help me with my homework?", "Haha! Canoe help me with my homework!");
    bot.reply("hello", "I don't know.");
    test.done();
};

exports.test_continuations = function(test) {
    var bot = new TestCase(test, "\
        + tell me a poem\n\
        - There once was a man named Tim,\\s\n\
        ^ who never quite learned how to swim.\\s\n\
        ^ He fell off a dock, and sank like a rock,\\s\n\
        ^ and that was the end of him.\n\
    ");
    bot.reply("Tell me a poem.", "There once was a man named Tim, "
        + "who never quite learned how to swim. "
        + "He fell off a dock, and sank like a rock, "
        + "and that was the end of him.");
    test.done();
};

exports.test_redirects = function(test) {
    var bot = new TestCase(test, "\
        + hello\n\
        - Hi there!\n\
        \n\
        + hey\n\
        @ hello\n\
        \n\
        + hi there\n\
        - {@hello}\n\
    ");
    bot.reply("hello", "Hi there!");
    bot.reply("hey", "Hi there!");
    bot.reply("hi there", "Hi there!");
    test.done();
};

exports.test_conditionals = function(test) {
    var bot = new TestCase(test, "\
        + i am # years old\n\
        - <set age=<star>>OK.\n\
        \n\
        + what can i do\n\
        * <get age> == undefined => I don't know.\n\
        * <get age> >  25 => Anything you want.\n\
        * <get age> == 25 => Rent a car for cheap.\n\
        * <get age> >= 21 => Drink.\n\
        * <get age> >= 18 => Vote.\n\
        * <get age> <  18 => Not much of anything.\n\
        \n\
        + am i your master\n\
        * <get master> == true => Yes.\n\
        - No.\n\
    ");
    var age_q = "What can I do?";
    bot.reply(age_q, "I don't know.");

    var ages = {
        '16' : "Not much of anything.",
        '18' : "Vote.",
        '20' : "Vote.",
        '22' : "Drink.",
        '24' : "Drink.",
        '25' : "Rent a car for cheap.",
        '27' : "Anything you want.",
    };
    for (age in ages) {
        if (!ages.hasOwnProperty(age))
            continue;
        bot.reply("I am " + age + " years old.", "OK.");
        bot.reply(age_q, ages[age]);
    }

    bot.reply("Am I your master?", "No.");
    bot.rs.setUservar(bot.username, "master", "true");
    bot.reply("Am I your master?", "Yes.");
    test.done();
};

exports.test_embedded_tags = function(test) {
    /* TODO: when fix is implemented */
    var bot = new TestCase(test, "\
        + my name is *\n\
        * <get name> != undefined => <set oldname=<get name>>I thought\\s\n\
          ^ your name was <get oldname>?\n\
          ^ <set name=<formal>>\n\
        - <set name=<formal>>OK.\n\
        \n\
        + what is my name\n\
        - Your name is <get name>, right?\n\
    ");
    bot.reply("What is my name?", "Your name is undefined, right?");
    bot.reply("My name is Alice.", "OK.");
    bot.reply("My name is Bob.", "I thought your name was Alice?");
    bot.reply("What is my name?", "Your name is Bob, right?");
    test.done();
};

/******************************************************************************
 * Object Macro Tests
 ******************************************************************************/

exports.test_js_objects = function(test) {
    var bot = new TestCase(test, '\
        > object nolang\n\
            return "Test w/o language."\n\
        < object\n\
        \n\
        > object wlang javascript\n\
            return "Test w/ language."\n\
        < object\n\
        \n\
        > object reverse javascript\n\
            msg = args.join(" ");\n\
            return msg.split("").reverse().join("");\n\
        < object\n\
        \n\
        > object broken javascript\n\
            return "syntax error\n\
        < object\n\
        \n\
        > object foreign perl\n\
            return "Perl checking in!";\n\
        < object\n\
        \n\
        + test nolang\n\
        - Nolang: <call>nolang</call>\n\
        \n\
        + test wlang\n\
        - Wlang: <call>wlang</call>\n\
        \n\
        + reverse *\n\
        - <call>reverse <star></call>\n\
        \n\
        + test broken\n\
        - Broken: <call>broken</call>\n\
        \n\
        + test fake\n\
        - Fake: <call>fake</call>\n\
        \n\
        + test perl\n\
        - Perl: <call>foreign</call>\n\
    ');
    bot.reply("Test nolang", "Nolang: Test w/o language.");
    bot.reply("Test wlang", "Wlang: Test w/ language.");
    bot.reply("Reverse hello world.", "dlrow olleh");
    bot.reply("Test broken", "Broken: [ERR: Error when executing JavaScript object]");
    bot.reply("Test fake", "Fake: [ERR: Object Not Found]");
    bot.reply("Test perl", "Perl: [ERR: Object Not Found]");
    test.done();
};

exports.test_disabled_js_language = function(test) {
    var bot = new TestCase(test, "\
        > object test javascript\n\
            return 'JavaScript here!';\n\
        < object\n\
        \n\
        + test\n\
        - Result: <call>test</call>\n\
    ");
    bot.reply("test", "Result: JavaScript here!");
    bot.rs.setHandler("javascript", undefined);
    bot.reply("test", "Result: [ERR: No Object Handler]");
    test.done();
};

/******************************************************************************
 * Topic Tests
 ******************************************************************************/

exports.test_punishment_topic = function(test) {
    var bot = new TestCase(test, "\
        + hello\n\
        - Hi there!\n\
        \n\
        + swear word\n\
        - How rude! Apologize or I won't talk to you again.{topic=sorry}\n\
        \n\
        + *\n\
        - Catch-all.\n\
        \n\
        > topic sorry\n\
            + sorry\n\
            - It's ok!{topic=random}\n\
            \n\
            + *\n\
            - Say you're sorry!\n\
        < topic\n\
    ");
    bot.reply("hello", "Hi there!");
    bot.reply("How are you?", "Catch-all.");
    bot.reply("Swear word!", "How rude! Apologize or I won't talk to you again.");
    bot.reply("hello", "Say you're sorry!");
    bot.reply("How are you?", "Say you're sorry!");
    bot.reply("Sorry!", "It's ok!");
    bot.reply("hello", "Hi there!");
    bot.reply("How are you?", "Catch-all.");
    test.done();
};

exports.test_topic_inheritence = function(test) {
    var RS_ERR_MATCH = "ERR: No Reply Matched";
    var bot = new TestCase(test, "\
        > topic colors\n\
            + what color is the sky\n\
            - Blue.\n\
            \n\
            + what color is the sun\n\
            - Yellow.\n\
        < topic\n\
        \n\
        > topic linux\n\
            + name a red hat distro\n\
            - Fedora.\n\
            \n\
            + name a debian distro\n\
            - Ubuntu.\n\
        < topic\n\
        \n\
        > topic stuff includes colors linux\n\
            + say stuff\n\
            - \"Stuff.\"\n\
        < topic\n\
        \n\
        > topic override inherits colors\n\
            + what color is the sun\n\
            - Purple.\n\
        < topic\n\
        \n\
        > topic morecolors includes colors\n\
            + what color is grass\n\
            - Green.\n\
        < topic\n\
        \n\
        > topic evenmore inherits morecolors\n\
            + what color is grass\n\
            - Blue, sometimes.\n\
        < topic\n\
    ");
    bot.rs.setUservar(bot.username, "topic", "colors");
    bot.reply("What color is the sky?", "Blue.");
    bot.reply("What color is the sun?", "Yellow.");
    bot.reply("What color is grass?", RS_ERR_MATCH);
    bot.reply("Name a Red Hat distro.", RS_ERR_MATCH);
    bot.reply("Name a Debian distro.", RS_ERR_MATCH);
    bot.reply("Say stuff.", RS_ERR_MATCH);

    bot.rs.setUservar(bot.username, "topic", "linux");
    bot.reply("What color is the sky?", RS_ERR_MATCH);
    bot.reply("What color is the sun?", RS_ERR_MATCH);
    bot.reply("What color is grass?", RS_ERR_MATCH);
    bot.reply("Name a Red Hat distro.", "Fedora.");
    bot.reply("Name a Debian distro.", "Ubuntu.");
    bot.reply("Say stuff.", RS_ERR_MATCH);

    bot.rs.setUservar(bot.username, "topic", "stuff");
    bot.reply("What color is the sky?", "Blue.");
    bot.reply("What color is the sun?", "Yellow.");
    bot.reply("What color is grass?", RS_ERR_MATCH);
    bot.reply("Name a Red Hat distro.", "Fedora.");
    bot.reply("Name a Debian distro.", "Ubuntu.");
    bot.reply("Say stuff.", '"Stuff."');

    bot.rs.setUservar(bot.username, "topic", "override");
    bot.reply("What color is the sky?", "Blue.");
    bot.reply("What color is the sun?", "Purple.");
    bot.reply("What color is grass?", RS_ERR_MATCH);
    bot.reply("Name a Red Hat distro.", RS_ERR_MATCH);
    bot.reply("Name a Debian distro.", RS_ERR_MATCH);
    bot.reply("Say stuff.", RS_ERR_MATCH);

    bot.rs.setUservar(bot.username, "topic", "morecolors");
    bot.reply("What color is the sky?", "Blue.");
    bot.reply("What color is the sun?", "Yellow.");
    bot.reply("What color is grass?", "Green.");
    bot.reply("Name a Red Hat distro.", RS_ERR_MATCH);
    bot.reply("Name a Debian distro.", RS_ERR_MATCH);
    bot.reply("Say stuff.", RS_ERR_MATCH);

    bot.rs.setUservar(bot.username, "topic", "evenmore");
    bot.reply("What color is the sky?", "Blue.");
    bot.reply("What color is the sun?", "Yellow.");
    bot.reply("What color is grass?", "Blue, sometimes.");
    bot.reply("Name a Red Hat distro.", RS_ERR_MATCH);
    bot.reply("Name a Debian distro.", RS_ERR_MATCH);
    bot.reply("Say stuff.", RS_ERR_MATCH);

    test.done();
};

/******************************************************************************
 * Unicode Tests
 ******************************************************************************/

exports.test_unicode = function(test) {
    var bot = new TestCase(test, "\
        ! sub who's = who is\n\
        \n\
        + äh\n\
        - What's the matter?\n\
        \n\
        + ブラッキー\n\
        - エーフィ\n\
        \n\
        // Make sure %Previous continues working in UTF-8 mode.\n\
        + knock knock\n\
        - Who's there?\n\
        \n\
        + *\n\
        % who is there\n\
        - <sentence> who?\n\
        \n\
        + *\n\
        % * who\n\
        - Haha! <sentence>!\n\
        \n\
        // And with UTF-8.\n\
        + tëll më ä pöëm\n\
        - Thërë öncë wäs ä män nämëd Tïm\n\
        \n\
        + more\n\
        % thërë öncë wäs ä män nämëd tïm\n\
        - Whö nëvër qüïtë lëärnëd höw tö swïm\n\
        \n\
        + more\n\
        % whö nëvër qüïtë lëärnëd höw tö swïm\n\
        - Hë fëll öff ä döck, änd sänk lïkë ä röck\n\
        \n\
        + more\n\
        % hë fëll öff ä döck änd sänk lïkë ä röck\n\
        - Änd thät wäs thë ënd öf hïm.\n\
    ", {"utf8": true});

    bot.reply("äh", "What's the matter?");
    bot.reply("ブラッキー", "エーフィ");
    bot.reply("knock knock", "Who's there?");
    bot.reply("Orange", "Orange who?");
    bot.reply("banana", "Haha! Banana!");
    bot.reply("tëll më ä pöëm", "Thërë öncë wäs ä män nämëd Tïm");
    bot.reply("more", "Whö nëvër qüïtë lëärnëd höw tö swïm");
    bot.reply("more", "Hë fëll öff ä döck, änd sänk lïkë ä röck");
    bot.reply("more", "Änd thät wäs thë ënd öf hïm.");
    test.done();
};
