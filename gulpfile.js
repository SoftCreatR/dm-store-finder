const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const del = require("del");
const { src, dest, watch, series, parallel } = require("gulp");
const inlinesource = require("gulp-inline-source");
const pipeline = require("readable-stream").pipeline;
const sass = require("gulp-sass");
const uglify = require("gulp-uglify-es").default;

// File paths
const paths = {
  tmpPath: "./tmp",
  distPath: "./docs",
  scssPath: "./src/style.scss",
  jsPath: "./src/script.js",
  htmlPath: "./src/index.html"
}

// Clean temp directory before and after build
const cleanTmp = () => {
  return del(paths.tmpPath);
};

// Build CSS from source
const buildCSS = () => {
  return src(paths.scssPath)
    .pipe(sass({
        outputStyle: "compressed"
    }))
    .pipe(dest(paths.tmpPath))
};

// Build JS from source
const buildJS = () => {
  return src(paths.jsPath)
    .pipe(babel({
        presets: ['@babel/preset-env']
    }))
    .pipe(uglify({
        compress: {
            arguments: true,
            booleans_as_integers: true
        }
    }))
    .pipe(dest(paths.tmpPath))
};

// Build HTML from source and inject assets
const buildHTML = () => {
  return src(paths.htmlPath)
    .pipe(inlinesource())
    .pipe(dest(paths.distPath));
};

// Dev functions
const startWatch = () => {
  const _series = series(
    parallel(buildCSS, buildJS),
    buildHTML,
    cleanTmp
  );

  watch(paths.scssPath, _series),
  watch(paths.jsPath, _series),
  watch(paths.htmlPath, _series);
};

const serve = () => {  
  browserSync.init({
    open: true,
    server: {
      baseDir: paths.distPath
    }
  });

  watch(paths.distPath + "/index.html")
    .on('change', browserSync.reload);
};

// Tasks
exports.default = series(
  cleanTmp,
  parallel(buildCSS, buildJS),
  buildHTML,
  cleanTmp
);

exports.dev = series(
  parallel(buildCSS, buildJS),
  buildHTML,
  cleanTmp,
  parallel(serve, startWatch)
);
