exiftool.js
===========

A pure javascript implementation of Phil Harvey's excellent [exiftool](http://www.sno.phy.queensu.ca/~phil/exiftool/). This extends work started by [Jacob Seidelin](http://www.nihilogic.dk/labs/exifjquery/) and aims to support parsing of all the tags that exiftool is capable of. Currently only jpeg is supported.

See how well we're doing in the latest [Coverage report](http://mattburns.github.io/exiftool.js/test/generated/reports/)


Usage
=====

With jQuery:

```
$(this).getExifFromUrl(url, function(exif) {
    console.log("Make is : " + exif["Make"]);
});

```

Or you can read from a local file (like drag and drop):

```
var binaryReader = new FileReader();
binaryReader.onloadend = function() {
    var exif = $(this).findEXIFinJPEG(binaryReader.result);
    console.log("Make is : " + exif["Make"]);
}
binaryReader.readAsBinaryString(file);

```

Or using node.js (exiftool.js is packaged on npm [here](https://www.npmjs.org/package/exiftool.js)):

```
var exiftool = require('exiftool.js');
var fs = require('fs');

exiftool.getExifFromLocalFileUsingNodeFs(fs, imgFile, function(err, exif) {
    console.log("Make is : " + exif["Make"]);
});
```

Or for node.js if the image is already in a Buffer:

```
var exiftool = require('exiftool.js');

exiftool.getExifFromNodeBuffer(buffer, function(err, exif) {
    console.log("Make is : " + exif["Make"]);
});
```


Coverage
========

You can view exactly how the results from this library fair verses the perl library against images from 6,000 different camera models here:
[Coverage report](http://mattburns.github.io/exiftool.js/test/generated/reports/)

I see no reason why this library can't match (and exceed!) the parsing capabilities of the orginal perl library but I need your help. Please fork this repo, create pull request and issue, whatever. You can just play with making improvements to the code so that the coverage goes up. 

Note that all the test files used to be in this repo which means the history is really big. Avoid a large checkout using a `depth` of 1. The test files are now kept in a submodule, so you'll need the `recursive` option.

```
git clone --depth 1 --recursive https://github.com/mattburns/exiftool.js.git
```

It's easy to see how much your changes are improving this thanks to the coverage report above. To regenerate this simply run:

```
npm install
npm test
```

This will thrash every sample image through exiftool.js, and variants of node-exif then generate the report files to compare the output.


Alternatively, there's a slower version for the paranoid:

```
npm install
env exiftoolclean=true npm test
```

This will do the same thing, but also ensure the json output files generated from the perl exiftool are up to date.

Because we use a submodule, diff your changes using:

```
git diff && git submodule foreach 'git diff'
```

And push using:

```
git push --recurse-submodules=on-demand
```


Adding more images
==================

If you want to test some of your own image files, copy them into the sampleImages/_Other directory. Then, if you want to check them in, I have a script (c/o Phil Harvey) that will swap the main image with a small blank white square. This keeps the files small but don't rely on it giving you full anonymity because there may still be thumbnail image data in the file or other personal info in the filesname or other exif tags.

The script is called `swap_image.pl` but to keep things complicated, I suggest you just run the ant script:

```
ant
```

