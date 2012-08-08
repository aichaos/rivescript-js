#!/usr/bin/perl

# The RiveScript.JS docs are somewhat JavaDoc-ish, but not quite.
# This is just a quick Perl script to make the docs user friendly.

my $inJavadoc = 0;
my @blocks = { type => "text", text => [] };

open (my $fh, "<", "bin/RiveScript.js");
while (my $line = <$fh>) {
	chomp $line;
	$line =~ s/^[\s\t]+//g;

	if ($line =~ /^\/\*\*/) {
		$inJavadoc = 1;
		next;
	} elsif ($line =~ /\*\//) {
		$inJavadoc = 0;
		push @blocks, {
			type => "text",
			text => [],
		};
		next;
	}

	if ($inJavadoc) {
		if ($line !~ /^\*/) {
			warn "Weird error: line doesn't begin with '* '";
			next;
		}
		$line =~ s/^\*\s*//;

		# Class lines.
		if ($line =~ /^(JsRiveObjects|RiveScript)/ && $blocks[-1]->{type} eq "text") {
			print "Found package: $1\n";
			$blocks[-1]->{type} = "package";
			$blocks[-1]->{package} = $1;
			$blocks[-1]->{declare} = $line;
		}

		# Function lines
		elsif ($line =~ /^(void|string|float|private|int|bool|data)/ && $blocks[-1]->{type} eq "text") {
			$blocks[-1]->{type}    = "function";
			$blocks[-1]->{declare} = $line;
		}

		# Text
		else {
			push @{$blocks[-1]->{text}}, $line;
		}
	}
}
close($fh);
undef $fh;

print Dumper(\@blocks); use Data::Dumper;

# Write to the docs folder.
foreach my $block (@blocks) {
	# A package block?
	if ($block->{type} eq "package") {
		# Close out the old file?
		if (defined $fh) {
			print {$fh} html_footer();
		}

		# Write a new file.
		my $package = $block->{package};
		open ($fh, ">", "./docs/$package.html");
		print {$fh} html_header($block) . "<hr>\n\n";
	}
	elsif ($block->{type} eq "function") {
		next if scalar @{$block->{text}} == 0;
		print {$fh} "<h2>$block->{declare}</h2>\n\n"
			. join("<br>\n", @{$block->{text}}) . "<hr>\n\n";
	}
	else {
		next if scalar @{$block->{text}} == 0;
		print {$fh} join("<br>\n", @{$block->{text}}) . "<hr>\n\n";
	}
}

print {$fh} html_footer();

sub html_header {
	my $block = shift;
	return <<"EOF"
<!DOCTYPE html>
<html>
<head>
<title>$block->{package}</title>
<link rel="stylesheet" type="text/css" href="docs.css">
</head>
<body>

<h1>$block->{package}</h1>

<hr>

<h1>Methods</h1>

<h2>$block->{declare}</h2>
EOF
	. join("<br>\n", @{$block->{text}}) . "\n\n";
}

sub html_footer {
	return "</body>\n</html>\n";
}
