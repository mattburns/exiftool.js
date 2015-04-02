/*jslint node: true */
/*global describe, it */
'use strict';
var assert = require("assert");
var walk = require('walk');
var fs = require('node-fs');
var sys = require('sys');
var exec = require('child_process').exec;

var exiftoolJS = require('../exiftool.js');
var Gomfunkel = require('exif').ExifImage;
var Redaktor = require('exifr').ExifImage;

var programs = ['exiftool', 'exiftool.js', 'Gomfunkel', 'Redaktor'];

var coverageSummaryHolder = {
    'supportedTags': {},
    'supportedTagsByFile': {}
};

/**
 * Sort an object's key's alphabetically.
 * Not strictly legit since key ordering is not guaranteed...
 */
function sortObject(o) {
    var sorted = {}, key, a = [];

    for (key in o) {
        if (o.hasOwnProperty(key)) {
            a.push(key);
        }
    }

    a.sort();

    for (key = 0; key < a.length; key += 1) {
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
function saveJson(json, imgFile, program) {
    var pathString = json.img,
        trimmedImageName = imgFile.substring(imgFile.indexOf('sampleImages')),
        jsonFile = 'test/generated/json/' + program + '/' + trimmedImageName + '.json',
        parentDir = jsonFile.substring(0, jsonFile.lastIndexOf("/"));
    fs.mkdirSync(parentDir, '0777', true);
    fs.writeFileSync(jsonFile, JSON.stringify(json, null, '\t'));
}

function extractExifUsingExiftool(imgFile, callback) {
	var trimmedImageName = imgFile.substring(imgFile.indexOf('sampleImages'));
    fs.readFile('test/generated/json/exiftool/' + trimmedImageName + '.json', 'utf8', function (err, data) {
        try {
            // First, try to load json from file
            var exifFromExiftool = JSON.parse(data);
            callback(err, exifFromExiftool);
        } catch (error) {
            // Failing that, let's fire up exiftool
            exec("exiftool -q -q -F -j --FileAccessDate --FileModifyDate --FileInodeChangeDate --SourceFile --ExifToolVersion --FileName --Directory --FilePermissions --FileSize --FileModifyDate --FileType --MIMEType '" + imgFile + "'", function (error, stdout, stderr) {
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
                    delete exifFromPerl.SourceFile;
                    exifFromPerl = sortObject(exifFromPerl);
                    callback(error, exifFromPerl);
                }
            });
        }

    });
}

var createNodeExifCallbackHandler = function (program, callback) {
    return function (error, exif) {
        var key,
            exifKey,
            valueType;
        if (error) {
            console.log(program + ' Error: ' + error.message);
        } else {
            // Loop over any children like "exif", "image" or "makernote" 
            for (key in exif) {
                if (exif.hasOwnProperty(key)) {
                    // ...then loop over their children moving them up to the root
                    for (exifKey in exif[key]) {
                        if (exif[key].hasOwnProperty(exifKey)) {
                            // skip Objects FIXME: needed?
                            valueType = Object.prototype.toString.call(exif[key][exifKey]);
                            if (valueType !== "[object Object]") {
                                exif[exifKey] = exif[key][exifKey];
                            }
                        }
                    }
                    if (typeof exif[key] === 'object') {
                        delete exif[key];
                    }
                }
            }
        }
        callback(error, exif);
    };
};

function extractExifUsingExiftoolJS(imgFile, callback) {
    var fd,
        buffer,
        readSize = 100000;
    fd = fs.openSync(imgFile, 'r');
    buffer = new Buffer(readSize);
    fs.readSync(fd, buffer, 0, readSize, 0);
    fs.closeSync(fd);
    
    exiftoolJS.getExifFromNodeBuffer(buffer, callback);
    
//    exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, imgFile, callback);
}

function extractExifUsingGomfunkel(imgFile, callback) {
    var gf = new Gomfunkel({ image : imgFile }, createNodeExifCallbackHandler('Gomfunkel', callback));
}

function extractExifUsingRedaktor(imgFile, callback) {
    var r = new Redaktor({ image : imgFile }, createNodeExifCallbackHandler('Redaktor', callback));
}

/**
 * Extract the exif from the given file using thegiven program. Pass to the callback object.
 */
function extractExif(imgFile, program, callback) {
    var pathString = 'test/generated/json/' + program + '/' + imgFile + '.json';

    switch (program) {
    case 'exiftool':
        extractExifUsingExiftool(imgFile, callback);
        break;
    case 'exiftool.js':
        extractExifUsingExiftoolJS(imgFile, callback);
        break;
    case 'Gomfunkel':
        extractExifUsingGomfunkel(imgFile, callback);
        break;
    case 'Redaktor':
        extractExifUsingRedaktor(imgFile, callback);
        break;
    }
}

function writeFileCoverageReport(allExif, image, coverageSummary, callback) {
	var trimmedImageName = image.substring(image.indexOf('sampleImages')),
        html = "<h3>" + image + "</h3>\n" +
                "<table class='table table-bordered'>" +
                "<thead><tr>" +
                "<th>tag</th>",
        i,
        j,
        program,
        key,
        rowHtml;
    for (i = 0; i < programs.length; i += 1) {
        program = programs[i];
        html += "<th>" + program + "</th>";
    }
    html += "</tr></thead>\n<tbody>\n";
    for (key in allExif.exiftool) {
        if (allExif.exiftool.hasOwnProperty(key)) {
            rowHtml = "<tr>\n";

            rowHtml += "<td>" + key + "</td>\n";

            for (j = 0; j < programs.length; j += 1) {
                program = programs[j];

                // Coerce into string for comparison
                if (String(allExif[program][key]) === String(allExif.exiftool[key])) {
                    rowHtml += "<td class='match'>" + allExif[program][key] + "</td>\n";
                    if (!coverageSummary.supportedTags) {
                        coverageSummary.supportedTags = {};
                        coverageSummary.supportedTagsByFile = {};
                    }
                    if (!coverageSummary.supportedTagsByFile[image]) {
                        coverageSummary.supportedTagsByFile[image] = {};
                    }
                    coverageSummary.supportedTags[program] = coverageSummary.supportedTags[program] + 1 || 1;
                    coverageSummary.supportedTagsByFile[image][program] = coverageSummary.supportedTagsByFile[image][program] + 1 || 1;
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
    }
    html += "</tbody></table>";
    

    fs.readFile('test/report/template.html', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(/htmlbody/g, html).replace(/cssparent/g, "../../../../report"),
            trimmedImageName = image.substring(image.indexOf('sampleImages')),
            reportFile = 'test/generated/reports/' + trimmedImageName + '.html',
            parentDir = reportFile.substring(0, reportFile.lastIndexOf("/"));
        
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, '0777', true);
        }
        fs.writeFile(reportFile, result, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            } else {
                callback(coverageSummary);
            }
        });
    });
}

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
function writeSummaryCoverageReport(coverageSummary, callback) {
    var html = "<h3>Total tag support</h3>\n" +
        "<table class='table table-bordered'>",
        i,
        program,
        key,
        count,
        pDir,
        reportFile;
    for (i = 0; i < programs.length; i += 1) {
        program = programs[i];
        html += "<tr><th>" + program + "</th><td>" + (coverageSummary.supportedTags[program] || 0) + "/" + (coverageSummary.supportedTags.exiftool || 0) + "</td></tr>\n";
    }
    html += "</table>";

    html += "<h3>Manfacturer tag support</h3>";
    
    // Write the table header...
    html += "<table class='table table-bordered'><tr><th>File</th>";
    for (i = 0; i < programs.length; i += 1) {
        program = programs[i];
        html += "<th>" + program + "</th>\n";
    }
    html += "</tr>";

    // Write a row for each image file
    for (key in coverageSummary.supportedTagsByFile) {
        if (coverageSummary.supportedTagsByFile.hasOwnProperty(key)) {
            html += "<tr><td><a href='" + key + ".html'>" + key + "</a></td>";
            for (i = 0; i < programs.length; i += 1) {
                program = programs[i];
                count = coverageSummary.supportedTagsByFile[key][program] || 0;
                html += "<td" + (count === 0 ? " class='missing' " : "") + ">" + count + "</td>";
            }
            html += "</tr>\n";
        }
    }

    // Write the total count row
    html += "<tr>";
    html += "<th>Totals</th>";
    for (i = 0; i < programs.length; i += 1) {
        program = programs[i];
        html += "<th>" + coverageSummary.supportedTags[program] + "</th>";
    }
    html += "</tr>\n";
    html += "</table>";

    fs.readFile('test/report/template.html', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(/htmlbody/g, html).replace(/cssparent/g, "../../report");

        pDir = 'test/generated/reports/';
        reportFile = pDir + 'index.html';
        
        fs.writeFile(reportFile, result, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
            callback(coverageSummary);
        });
    });
}


/**
 * Write the html coverage report, and update the coverage summary page.
 */
function updateReports(allExif, image, coverageSummary, callback) {
    writeFileCoverageReport(allExif, image, coverageSummary, (function (cb) {
        return function (cs) {
            writeSummaryCoverageReport(cs, cb);
        };
    }(callback)));
}

function makeExifHandler(image, program, allExif, next) {
    return function (err, oExif) {
        if (oExif) {
            saveJson(oExif, image, program);
            allExif[program] = oExif;
        } else {
            allExif[program] = {};
        }
        if (Object.keys(allExif).length === programs.length) {
            var trimmedImageName = image.substring(image.indexOf('sampleImages'));

            updateReports(allExif, trimmedImageName, coverageSummaryHolder, function (cs) {
                coverageSummaryHolder = cs;
                next();
            });
        }
    };
}

function start(done) {

    var options = {
            followLinks : false
        },
        walker,
        filesProcessed;
    
    walker = walk.walk("node_modules/exiftool.js-dev-dependencies/sampleImages", options);

    walker.on("names", function (root, nodeNamesArray) {
        nodeNamesArray.sort(function (a, b) {
            if (a < b) {
                return 1;
            } else if (a > b) {
                return -1;
            } else {
                return 0;
            }
        });
    });

    walker.on("directories", function (root, dirStatsArray, next) {
        next();
    });

    filesProcessed = 0;
	walker.on("end", function () {
		console.log(filesProcessed + " files processed");
        done();
	});
    /**
     * This is where the magic happens. Run this function for each file found in sampleImages.
     */
    walker.on("file", function (root, fileStats, next) {
        var imgFile = root + '/' + fileStats.name,
            allExif,
            i;

        if (fileStats.name === 'PanasonicDMC-GM1.jpg'
                || fileStats.name === 'PanasonicDMC-GX7.jpg'
                || fileStats.name === 'PanasonicDMC-SZ5.jpg'
                || fileStats.name === 'PanasonicDMC-XS3.jpg'
                || fileStats.name === 'IMG_6756.JPG'
                || fileStats.name === 'big file - IMG_6756.JPG'
                || fileStats.name === 'SamsungGT-I9100.jpg'
                ) {
            // Skip these files as they get stuck in infinite loops!
            next();
        } else {
            try {

                console.log("processing: " + imgFile);
                
                allExif = {};

                for (i = 0; i < programs.length; i += 1) {
                    extractExif(imgFile, programs[i], makeExifHandler(imgFile, programs[i], allExif, next));
                }
                filesProcessed += 1;
            } catch (error) {
                console.log('in Error: ' + error.message);
                next();
            }
        }
    });
}

describe('For Canon images', function () {
    it('should find InternalSerialNumber (used to incorrectly be InternalSerialInfo)', function (done) {
        exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, 'node_modules/exiftool.js-dev-dependencies/sampleImages/Canon/CanonEOS1000D.jpg',
                function (err, exif) {
                assert.equal('K0012754', exif.InternalSerialNumber);
                done();
            });
    });
    it('should zero-pad SerialNumber', function (done) {
        exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, 'node_modules/exiftool.js-dev-dependencies/sampleImages/Canon/CanonDigitalRebelXT.jpg',
                function (err, exif) {
                assert.equal('0320131248', exif.SerialNumber);
                assert('0320131248' === exif.SerialNumber); // Ensure it is a string
                done();
            });
    });
    it('should not zero-pad InternalSerialNumber', function (done) {
        exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, 'node_modules/exiftool.js-dev-dependencies/sampleImages/Canon/CanonEOS1000D.jpg',
                function (err, exif) {
                assert.equal('K0012754', exif.InternalSerialNumber);
                done();
            });
    });
    it('should not trim last character from InternalSerialNumber', function (done) {
        exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, 'node_modules/exiftool.js-dev-dependencies/sampleImages/Canon/CanonEOS_REBEL_T1i.jpg',
                function (err, exif) {
                assert.equal('Q001423204090227', exif.InternalSerialNumber);
                done();
            });
    });
});

describe('dfries bugs', function () {
    it('should decode mores ascii', function (done) {
        exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, 'node_modules/exiftool.js-dev-dependencies/sampleImages/Daisy/DaisyMultimedia.jpg',
                function (err, exif) {
                assert.equal('Exif_JPEG', exif.ImageDescription);
                done();
            });
    });
    it('shouldnt drop last char', function (done) {
        exiftoolJS.getExifFromLocalFileUsingNodeFs(fs, 'node_modules/exiftool.js-dev-dependencies/sampleImages/DXG/DXG_DZ358.jpg',
                function (err, exif) {
                assert.equal('DXG DZ358', exif.Model);
                done();
            });
    });
});


describe('For _Other images', function () {
    it('if SerialNumber not parsed, omit from response (although in this case, we should really be getting a SN)', function (done) {
        var fdVakantie,
            bufferVakantie,
            readSize = 100000;
        fdVakantie = fs.openSync('node_modules/exiftool.js-dev-dependencies/sampleImages/_Other/vakantie anna frankrijk 094.JPG', 'r');
        bufferVakantie = new Buffer(readSize);
        fs.readSync(fdVakantie, bufferVakantie, 0, readSize, 0);
        fs.closeSync(fdVakantie);
        
        exiftoolJS.getExifFromNodeBuffer(bufferVakantie,
            function (err, exif) {
                assert.equal(null, exif.SerialNumber);
                done();
            });
    });
    it('Parse imageuniqueid even if its alread a string and not array of ints', function (done) {
        var fdIMG2705,
            bufferIMG2705,
            readSize = 100000;
        fdIMG2705 = fs.openSync('node_modules/exiftool.js-dev-dependencies/sampleImages/_Other/IMG_2705.JPG', 'r');
        bufferIMG2705 = new Buffer(readSize);
        fs.readSync(fdIMG2705, bufferIMG2705, 0, readSize, 0);
        fs.closeSync(fdIMG2705);
        
        exiftoolJS.getExifFromNodeBuffer(bufferIMG2705,
            function (err, exif) {
                assert.equal('285C82E562E84FAFA3BFD2C4CE484D05', exif.ImageUniqueID);
                done();
            });
    });
});
    
describe('Intermittent failures. Proves issue #8, skipping until fixed...', function () {
    var i,
        readSize = 100000,
        fdIMG2705,
        bufferIMG2705,
        fdVakantie,
        bufferVakantie;
    
    fdIMG2705 = fs.openSync('node_modules/exiftool.js-dev-dependencies/sampleImages/_Other/IMG_2705.JPG', 'r');
    bufferIMG2705 = new Buffer(readSize);
    fs.readSync(fdIMG2705, bufferIMG2705, 0, readSize, 0);
    fs.closeSync(fdIMG2705);
    
    fdVakantie = fs.openSync('node_modules/exiftool.js-dev-dependencies/sampleImages/_Other/vakantie anna frankrijk 094.JPG', 'r');
    bufferVakantie = new Buffer(readSize);
    fs.readSync(fdVakantie, bufferVakantie, 0, readSize, 0);
    fs.closeSync(fdVakantie);
    
    
    function testA(done) {
        exiftoolJS.getExifFromNodeBuffer(bufferIMG2705,
            function (err, exif) {
                assert.equal('285C82E562E84FAFA3BFD2C4CE484D05', exif.ImageUniqueID);
                done();
            });
    }
    
    function testB(done) {
        exiftoolJS.getExifFromNodeBuffer(bufferVakantie,
            function (err, exif) {
                assert.equal(null, exif.SerialNumber);
                done();
            });
    }
        
    for (i = 0; i < 100; i += 1) {
        it('should always return the same ImageUniqueID. Test ' + i, testA);
    }
    for (i = 0; i < 100; i += 1) {
        it('should always return the same SerialNumber. Test ' + i, testB);
    }
});

// for faster dev, use : describe.skip('Gen...'
describe('Generate all html test reports', function () {
    it('should not explode', function (done) {
        this.timeout(0); // because it takes ages

        // Pass env variable to do a full clean first (slow!)
        // eg:
        //     env exiftoolclean=true mocha
        if (process.env.exiftoolclean) {
            var child = exec('rm -rf test/generated', function (err, out) {
                console.log("generated output dir cleaned.");
                start(done);
            });
        } else {
            start(done);
        }
    });
});
