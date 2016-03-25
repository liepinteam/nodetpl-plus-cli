'use strict';

import fs from 'fs';
import path from 'path';
import fsPath from 'fs-path';
import colors from 'colors/safe';
import minimist from 'minimist';
import NodeTplPlus from 'nodetpl-plus';
import {
  js_beautify as beautify
}
from 'js-beautify';
import {
  transform
}
from 'babel-core';

let index = 0;
let argv = minimist(process.argv.slice(2));
let options = {
  path: '',
  extname: '.tpl',
  transform: false,
  library: 'commonjs',
  watch: false
};
// get path value
if (argv._ && Array.isArray(argv._) && argv._.length > 0) {
  options.path = argv._[0];
} else {
  argv.h = true;
}
if (!path.isAbsolute(options.path)) {
  options.path = path.join(process.cwd(), options.path);
}
// get ext name
if (argv.e) {
  argv.extname = argv.e;
}
if (argv.extname) {
  options.extname = argv.extname;
}
// get transform
if (argv.t) {
  argv.transform = argv.t;
}
if (argv.transform) {
  options.transform = true;
}
// get library
if (argv.l) {
  argv.library = argv.l;
}
if (argv.library) {
  options.library = argv.library;
}
// get watch mode
if (argv.w) {
  argv.watch = argv.w;
}
if (argv.watch) {
  options.watch = true;
}
// help
if (argv.h) {
  console.log(`
<?  NodeTplPlus Precompile Tools  ?>

  version: v${NodeTplPlus.version}

  grammar:
    nodetpl-plus-cli <path> --extname .tpl --transform --watch

  arguments:
    <path>     : template file or directory path.
    --extname  : -e, the template extention name, default is ".tpl".
    --transform: -t, transform code to es5 happy, default is false.
    --library  : -l, the output library, umd | amd | cmd | commonjs | var | es, default is commonjs
    --watch    : -w, watch the file, automatically compile if changed.
`);
  process.exit(0);
}

// main start
console.log(`<?
  Hello, NodeTpl-Plus
  extname  : ${options.extname}
  transform: ${options.transform}
  library  : ${options.library}
  watch    : ${options.watch}
  version  : ${NodeTplPlus.version}
?>`);

/**
 * File Compile Class
 */
class Tools {
  constructor(filepath) {
    this.filepath = filepath;
    return this;
  }

  read() {
    var that = this;
    return new Promise(function(resolve, reject) {
      fs.readFile(that.filepath, 'utf-8', function(err, content) {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  }

  transform(data) {
    return new NodeTplPlus({
      library: options.library
    }).compile(data);
  }

  beautify(data) {
    return beautify(data, {
      indent_size: 2
    });
  }

  es5(data) {
    return new Promise(function(resolve, reject) {
      try {
        let result = transform(data, {
          presets: [
            require.resolve('babel-preset-es2015'),
          ],
          plugins: [
            require.resolve('babel-plugin-transform-es3-property-literals'),
            require.resolve('babel-plugin-transform-es3-member-expression-literals')
          ]
        });
        resolve(result.code);
      } catch (e) {
        reject(e);
      }
    });
  }

  write(data) {
    var that = this;
    return new Promise(function(resolve, reject) {
      let pathInfo = path.parse(that.filepath);
      let distpath = path.resolve(pathInfo.dir, pathInfo.name + '.js');
      console.log('>> [' + (++index) + ']\t' + colors.underline(distpath));
      fs.writeFile(distpath, data, 'utf-8', function(err, content) {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  }

  compile() {
    return Promise.resolve()
      .then(this.read.bind(this))
      .then(this.transform.bind(this))
      .then(function(data) {
        if (options.transform) {
          return this.es5(data);
        } else {
          return this.beautify(data);
        }
      }.bind(this))
      .then(this.write.bind(this))
      .catch(function(err) {
        console.log(colors.bgRed('>> Compile Error: ' + this.filepath));
        console.log(err.stack);
      }.bind(this));
  }
}

/**
 * File find and listen class
 */
class Finder {
  constructor() {
    Promise.resolve()
      .then(this.stat)
      .then(this.filter)
      .then(this.transform);
  }

  stat() {
    return new Promise(function(resolve, reject) {
      fs.stat(options.path, function(err, stats) {
        if (err) {
          reject(err);
        } else {
          if (stats.isDirectory()) {
            resolve('directory');
          } else if (stats.isFile()) {
            resolve('file');
          } else {
            reject(new Error('Unkown stats ' + options.path));
          }
        }
      });
    });
  }

  filter(mode) {
    if (mode === 'directory') {
      console.log('>> Directory: ' + options.path);
      return new Promise(function(resolve, reject) {
        fsPath.find(options.path, function(filepath, stats, filename) {
          return !/^\./.test(filename) && (stats === 'directory' || path.extname(filepath) === options.extname);
        }, function(err, list) {
          if (err) {
            reject(err);
          } else {
            resolve(list.files);
          }
        });
      });
    } else if (mode === 'file') {
      console.log('>> File: ' + options.path);
      return new Promise(function(resolve, reject) {
        fs.exists(options.path, function(exists) {
          if (exists) {
            resolve([options.path]);
          } else {
            reject(new Error('file ' + options.path + ' not exists.'));
          }
        });
      });
    }
  }

  transform(filelist) {
    var promises = filelist.map(function(filepath) {
      options.watch && fs.watchFile(filepath, function(curr, prev) {
        new Tools(filepath).compile();
        console.log('\t' + curr.mtime);
      });
      return new Tools(filepath).compile();
    });
    Promise.all(promises).catch(function(err) {
      console.log(colors.bgRed('>> Compile Error: ' + options.path));
      console.log(err.stack);
    });
  }
}
new Finder();