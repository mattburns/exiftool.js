var assert = require("assert");
var exiftoolJS = require('../exiftool.js');
var fs = require('fs');

describe('Make parsing', function(){
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
