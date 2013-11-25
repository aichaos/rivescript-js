// Administrative functions.

+ shutdown{weight=10000}
* <id> eq <bot master> => Shutting down... <call>shutdown</call>
- {@botmaster only}

+ botmaster only
- This command can only be used by my botmaster. <id> != <bot master>

> object shutdown perl
	my ($rs) = @_;

	# Shut down.
	exit(0);
< object
