#!/usr/bin/perl

use strict;
use warnings;
use JavaScript::Minifier qw(minify);

open (my $in,  "<", "./lib/rivescript.js");
open (my $out, ">", "./lib/rivescript.min.js");
minify(input => $in, outfile => $out);
close ($in);
close ($out);
