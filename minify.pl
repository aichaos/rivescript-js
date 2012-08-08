#!/usr/bin/perl

use strict;
use warnings;
use JavaScript::Minifier qw(minify);

open (my $in,  "<", "./bin/RiveScript.js");
open (my $out, ">", "./bin/RiveScript.min.js");
minify(input => $in, outfile => $out);
close ($in);
close ($out);
