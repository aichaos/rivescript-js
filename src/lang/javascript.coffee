# JavaScript Language Support for RiveScript Macros

class JSObjectHandler
    constructor: (master) ->
        @_master  = master
        @_objects = {}

    load: (name, code) ->
        # We need to make a dynamic JavaScript function.
        source = "this._objects[\"" + name + "\"] = function(rs, args) {\n" \
            + code.join("\n") \
            + "}\n"

        try
            eval source
        catch e
            @_master.warn "Error evaluating JavaScript object: " + e.message

    call: (rs, name, fields, scope) ->
        # Call the dynamic method.
        func = @_objects[name]
        reply = ""
        try
            reply = func.call(scope, rs, fields)
        catch
            reply = "[ERR: Error when executing JavaScript object]"

        # Allow undefined responses.
        if reply is undefined
            reply = ""

        return reply

module.exports = JSObjectHandler
