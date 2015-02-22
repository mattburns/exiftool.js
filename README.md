exiftool.js
===========

A pure javascript implementation of Phil Harvey's excellent [exiftool](http://www.sno.phy.queensu.ca/~phil/exiftool/). This extends work started by [Jacob Seidelin](http://www.nihilogic.dk/labs/exifjquery/) and aims to support parsing of all the tags that exiftool is capable of.

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


Coverage
========

You can view exactly how the results from this library fair verses the perl library against images from 6,000 different camera models here:
[Coverage report](http://mattburns.github.io/exiftool.js/test/generated/reports/)

I see no reason why this library can't match (and exceed!) the parsing capabilities of the orginal perl library but I need your help. Please fork this repo, create pull request and issue, whatever. You can just play with making improvements to the code so that the coverage goes up. 

To keep this a small module on npm, the test images are stored in a different repository: https://github.com/mattburns/exiftool.js-dev-dependencies They are fetched when installing this npm module if you pass the --dev flag to fetch devDependencies.

It's easy to see how much your changes are improving this thanks to the coverage report above. To regenerate this simply run:

```
mocha
```

This will thrash every sample image through exiftool.js, and variants of node-exif then generate the report files to compare the output.


Alternatively, there's a slower version for the paranoid:

```
node test/test.js clean
```

This will do the same thing, but also ensure the json output files generated from the perl exiftool are up to date.



Adding more images
==================

If you want to test some of your own image files, copy them into the sampleImages/_Other directory in the repository: https://github.com/mattburns/exiftool.js-dev-dependencies Then, if you want to check them in, I have a script (c/o Phil Harvey) that will swap the main image with a small blank white square. This keeps the files small but don't rely on it giving you full anonymity because there may still be thumbnail image data in the file or other personal info in the filesname or other exif tags.

The script is called `swap_image.pl` but to keep things complicated, I suggest you just run the ant script:

```
ant
```

