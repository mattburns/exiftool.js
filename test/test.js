//"use strict";

var assert = require("assert");
var walk = require('walk');
var fs = require('node-fs');
var sys = require('sys')
var exec = require('child_process').exec;

var exiftoolJS = require('../exiftool.js');
var Gomfunkel = require('exif').ExifImage;    
var Redaktor = require('exifr').ExifImage;    

var programs = ['exiftool', 'exiftool.js', 'Gomfunkel', 'Redaktor'];

var coverageSummaryHolder = {
    'supportedTags': {},
    'supportedTagsByFile': {},
};

/**
 * Sort an object's key's alphabetically.
 * Not strictly legit since key ordering is not guaranteed...
 */
var sortObject = function(o) {
    var sorted = {},
    key, a = [];

    for (key in o) {
        if (o.hasOwnProperty(key)) {
            a.push(key);
        }
    }

    a.sort();

    for (key = 0; key < a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }
    return sorted;
}

/**
 * Save the exif for the current image into a json file.
 * json - js object, basically just map of tags to values.
 * imgFile - path of image under test
 * program - name of program that extracted the exif (exiftool.js or Redaktor etc.)
 */
var saveJson = function(json, imgFile, program) {
    var pathString = json.img;
    var trimmedImageName = imgFile.substring(imgFile.indexOf('sampleImages'));

    var jsonFile = 'test/generated/json/' + program + '/' + trimmedImageName + '.json';
    var parentDir = jsonFile.substring(0, jsonFile.lastIndexOf("/"));
    fs.mkdirSync(parentDir, 0777, true);
    fs.writeFileSync(jsonFile, JSON.stringify(json, null, '\t'));
};

/**
 * Extract the exif from the given file using thegiven program. Pass to the callback object.
 */
var extractExif = function(imgFile, program, callback) {
    var pathString = 'test/generated/json/' + program + '/' + imgFile + '.json';

    switch(program) {
        case 'exiftool' : {
            extractExifUsingExiftool(imgFile, callback);
            break;
        }
        case 'exiftool.js' : {
            extractExifUsingExiftoolJS(imgFile, callback);
            break;
        }
        case 'Gomfunkel' : {
            extractExifUsingGomfunkel(imgFile, callback);
            break;
        }
        case 'Redaktor' : {
            extractExifUsingRedaktor(imgFile, callback);
            break;
        }
    }
};

var extractExifUsingExiftool = function(imgFile, callback) {
	var trimmedImageName = imgFile.substring(imgFile.indexOf('sampleImages'));
    fs.readFile('test/generated/json/exiftool/' + trimmedImageName + '.json', 'utf8', function(err, data) {
        try {
            // First, try to load json from file
            var exifFromExiftool = JSON.parse(data);
            callback(err, exifFromExiftool);
        } catch (error) {
            // Failing that, let's fire up exiftool
            var child = exec("exiftool -q -q -F -j --FileAccessDate --FileModifyDate --FileInodeChangeDate --SourceFile --ExifToolVersion --FileName --Directory --FilePermissions --FileSize --FileModifyDate --FileType --MIMEType '" + imgFile + "'", function(error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error with ' + imgFile + ': ' + error);
                    callback();
                } else {
                    // stdout string takes some munging...
                    var exifFromPerl = String(stdout);
                    exifFromPerl = exifFromPerl.replace(/\r?\n|\r/g, ""); // lose newlines
                    exifFromPerl = exifFromPerl.substring(1,
                            exifFromPerl.length - 1); // lose surrounding []
                    exifFromPerl = JSON.parse(exifFromPerl);
                    delete exifFromPerl["SourceFile"];
                    exifFromPerl = sortObject(exifFromPerl);
                    callback(error, exifFromPerl);
                }
            });
        }

    });
};

var extractExifUsingExiftoolJS = function(imgFile, callback) {
    exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, imgFile, callback);
};

var extractExifUsingGomfunkel = function(imgFile, callback) {
    new Gomfunkel({ image : imgFile }, createNodeExifCallbackHandler('Gomfunkel', callback));
};

var extractExifUsingRedaktor = function(imgFile, callback) {
    new Redaktor({ image : imgFile }, createNodeExifCallbackHandler('Redaktor', callback));
};

var createNodeExifCallbackHandler = function (program, callback) {
    return function (error, exif) {
        if (error) {
            console.log(program + ' Error: ' + error.message);
        } else {
            // Loop over any children like "exif", "image" or "makernote" 
            for (var key in exif) {
                // ...then loop over their children moving them up to the root
                for (var exifKey in exif[key]) {
                    // skip Objects
                    var valueType = Object.prototype.toString.call(exif[key][exifKey]);
                    if (valueType != "[object Object]") {
                        exif[exifKey] = exif[key][exifKey];
                    }
                };
                if (typeof exif[key] === 'object') {
                    delete exif[key];
                }
            };
        }
        callback(error, exif);
    };
};

/**
 * Write the html coverage report, and update the coverage summary page.
 */
var updateReports = function(allExif, image, coverageSummary, callback) {
    writeFileCoverageReport(allExif, image, coverageSummary, (function(cb) {
        return function(cs) {
            writeSummaryCoverageReport(cs, cb);
        }
    })(callback));
}

var writeFileCoverageReport = function(allExif, image, coverageSummary, callback) {
	var trimmedImageName = image.substring(image.indexOf('sampleImages'));
    
    var html = "<h3>" + image + "</h3>\n" +
            "<table class='table table-bordered'>" +
            "<thead><tr>" +
            "<th>tag</th>";
    for (var i = 0 ; i < programs.length ; i++) {
        var program = programs[i];
        html += "<th>" + program + "</th>";
    }
    html += "</tr></thead>\n<tbody>\n";
    for (var key in allExif.exiftool) {
        var rowHtml = "<tr>\n";
            
        rowHtml += "<td>" + key + "</td>\n";

        for (var i = 0 ; i < programs.length ; i++) {
            var program = programs[i];
    
            if (allExif[program][key] == allExif.exiftool[key]) {
                rowHtml += "<td class='match'>" + allExif[program][key] + "</td>\n";
                if (!coverageSummary.supportedTags) {
                    coverageSummary.supportedTags = {};
                    coverageSummary.supportedTagsByFile = {};
                }
                if (!coverageSummary.supportedTagsByFile[image]) {
                    coverageSummary.supportedTagsByFile[image] = {};
                }
                coverageSummary.supportedTags[program] = ++coverageSummary.supportedTags[program] || 1;
                coverageSummary.supportedTagsByFile[image][program] = ++coverageSummary.supportedTagsByFile[image][program] || 1;
            } else {
                if (typeof allExif[program][key] === 'undefined') {
                    rowHtml += "<td class='missing'>-</td>\n";
                } else {
                    rowHtml += "<td class='diff'>" + allExif[program][key] + "</td>\n";
                }
            }
        }
        rowHtml += "</tr>\n";
        html += rowHtml;
    }
    html += "</tbody></table>";
    

    fs.readFile('test/report/template.html', 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(/htmlbody/g, html).replace(/cssparent/g, "../../../../report");

        var trimmedImageName = image.substring(image.indexOf('sampleImages'));
        var reportFile = 'test/generated/reports/' + trimmedImageName + '.html';
        var parentDir = reportFile.substring(0, reportFile.lastIndexOf("/"));
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, 0777, true);
        }
        fs.writeFile(reportFile, result, 'utf8', function(err) {
            if (err) {
                return console.log(err);
            } else {
                callback(coverageSummary);
            }
        });
    });
};

/**
 * The coverageSummary object looks like this:
 *
 * {
 *   'supportedTags' : {
 *     'exiftool' : 20,
 *     'exiftoolJS' : 10,
 *     'redaktor' : 10
 *   },
 *   'supportedTagsByFile' : {
 *     'acer/acer2.jpg' : {
 *       'exiftool' : 10,
 *       'exiftoolJS' : 5,
 *       'redaktor' : 5
 *     },
 *     'acer/acer1.jpg' : {
 *       'exiftool' : 10,
 *       'exiftoolJS' : 5,
 *       'redaktor' : 5
 *     }
 *   }
 * }
 */
var writeSummaryCoverageReport = function(coverageSummary, callback) {
    var html = "<h3>Total tag support</h3>\n" +
        "<table class='table table-bordered'>";
    for (var i = 0 ; i < programs.length ; i++) {
        var program = programs[i];
        html += "<tr><th>" + program + "</th><td>" + (coverageSummary.supportedTags[program] || 0) + "/" + (coverageSummary.supportedTags.exiftool || 0) + "</td></tr>\n";
    }
    html += "</table>";

    html += "<h3>Manfacturer tag support</h3>";
    
    // Write the table header...
    html += "<table class='table table-bordered'><tr><th>File</th>";
    for (var i = 0 ; i < programs.length ; i++) {
        var program = programs[i];
        html += "<th>" + program + "</th>\n";
    }
    html += "</tr>";

    // Write a row for each image file
    for (var key in coverageSummary.supportedTagsByFile) {
        html += "<tr><td><a href='" + key +".html'>" + key + "</a></td>";
        for (var i = 0 ; i < programs.length ; i++) {
            var program = programs[i];
            var count = coverageSummary.supportedTagsByFile[key][program] || 0;
            html += "<td" + (count==0?" class='missing' ":"") + ">" + count + "</td>";
        }
        html += "</tr>\n";
    }

    // Write the total count row
    html += "<tr>";
    html += "<th>Totals</th>";
    for (var i = 0 ; i < programs.length ; i++) {
        var program = programs[i];
        html += "<th>" + coverageSummary.supportedTags[program] + "</th>";
    }
    html += "</tr>\n";
    html += "</table>";

    fs.readFile('test/report/template.html', 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(/htmlbody/g, html).replace(/cssparent/g, "../../report");

        var pDir = 'test/generated/reports/';
        var reportFile = pDir + 'index.html';
        
        fs.writeFile(reportFile, result, 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }
            callback(coverageSummary);
        });
    });
};

var start = function(done) {

    var options = {
        followLinks : false
    };

    var walker = walk.walk("node_modules/exiftool.js-dev-dependencies/sampleImages", options);

    walker.on("names", function(root, nodeNamesArray) {
        nodeNamesArray.sort(function(a, b) {
            if (a < b)
                return 1;
            if (a > b)
                return -1;
            return 0;
        });
    });

    walker.on("directories", function(root, dirStatsArray, next) {
        next();
    });

    var filesProcessed = 0;
	walker.on("end", function () {
		console.log(filesProcessed + " files processed");
        done();
	});
    /**
     * This is where the magic happens. Run this function for each file found in sampleImages.
     */
    walker.on("file", function(root, fileStats, next) {
        var imgFile = root + '/' + fileStats.name;

        if (fileStats.name == 'PanasonicDMC-GM1.jpg'
         || fileStats.name == 'PanasonicDMC-GX7.jpg'
         || fileStats.name == 'PanasonicDMC-SZ5.jpg'
         || fileStats.name == 'PanasonicDMC-XS3.jpg'
         || fileStats.name == 'IMG_6756.JPG'
         || fileStats.name == 'big file - IMG_6756.JPG'
         || fileStats.name == 'SamsungGT-I9100.jpg'
            ) {
            // Skip these files as they get stuck in infinite loops!
            next();
        } else {
            try {

                console.log("processing: " + imgFile);
                
                var allExif = {};

                for (var i = 0 ; i < programs.length ; i++) {
                    extractExif(imgFile, programs[i], (function(image, program) {
                        return function(err, oExif) {
                        	if (oExif) {
                                saveJson(oExif, image, program);
                                allExif[program] = oExif;
                            } else {
                                allExif[program] = {};
                            }
                            if (Object.keys(allExif).length == programs.length) {
                	            var trimmedImageName = image.substring(image.indexOf('sampleImages'));

                                updateReports(allExif, trimmedImageName, coverageSummaryHolder, function(cs) {
                                    coverageSummaryHolder = cs;
                                    next();
                                });
                            }
                        };
                    })(imgFile, programs[i]));
                };
                filesProcessed++;
            } catch (error) {
                console.log('in Error: ' + error.message);
                next();
            }
        }
    });
};


describe('Very simple parsing test', function(){
    it('should return Canon', function(done) {
        exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, 'node_modules/exiftool.js-dev-dependencies/sampleImages/Canon/CanonEOS1000D.jpg',
                function(err, exif) {
            if (err) {
                done(err);
            }
            assert.equal('Canon', exif['Make']);
            done();
        });
    });
});


describe('Generate all html test reports', function(){
    it('should not explode', function(done) {
        this.timeout(0); // because it takes ages
        if (process.argv.length > 2 && process.argv[2] === 'clean') {
            var child = exec('rm -rf test/generated', function(err, out) {
            	console.log("generated output dir cleaned.");
                start(done);
            });
        } else {
            start(done);
        }
    });
});