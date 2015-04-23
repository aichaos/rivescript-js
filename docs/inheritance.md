# Topic inheritance functions.

These are helper functions to assist with topic inheritance and includes.

## string[] getTopicTriggers (RiveScript rs, string topic, object triglvl, int depth, int inheritance, int inherited)

Recursively scan through a topic and retrieve a listing of all triggers in
that topic and in all included/inherited topics. Some triggers will come out
with an {inherits} tag to signify inheritance depth.

* topic: The name of the topic
* thats: Boolean, are we getting replies with %Previous or not?
* triglvl: reference to this._topics or this._thats
* depth: recursion depth counter

Each "trigger" returned from this function is actually an array, where index
0 is the trigger text and index 1 is the pointer to the trigger's data within
the original topic structure.

## string[] getTopicTree (RiveScript rs, string topic, int depth)

Given a topic, this returns an array of every topic related to it (all the
topics it includes or inherits, plus all the topics included or inherited
by those topics, and so on). The array includes the original topic, too.